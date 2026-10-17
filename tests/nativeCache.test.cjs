const { build } = require('esbuild')
const Module = require('node:module')
const assert = require('node:assert/strict')
const path = require('node:path')

async function run() {
  const local = new Map(), disk = new Map(), sealed = []
  global.localStorage = { getItem: k => local.get(k) || null, setItem: (k,v) => local.set(k,v), removeItem: k => local.delete(k) }
  global.window = new EventTarget()
  let release, fail = false
  global.__seal = async (account, purpose, plaintext) => {
    sealed.push({ account, purpose, plaintext })
    await new Promise(resolve => { release = resolve })
    return 'sealed:' + plaintext
  }
  global.__write = async (key, value) => { if (fail) throw new Error('disk failed'); disk.set(key,value) }
  global.__read = async key => disk.get(key) || null
  global.__delete = async key => { disk.delete(key) }
  const mocks = {
    '../api/proxy-bridge': 'export const applyNativeProxy=async()=>{}; export const clearNativeProxy=async()=>{}',
    '../utils/offlineCache': 'export const MEDIA_CACHE_NAME="media"; export const readOfflineData=(k,v)=>v; export const writeOfflineData=()=>{}',
    '../api/secure-storage': 'export const hasNativeSecureStorage=()=>true; export const sealForAccount=(...args)=>globalThis.__seal(...args); export const openForAccount=async(a,p,v)=>v.slice(7)',
    '../utils/secureCacheDb': 'export const writeSecureCache=(...args)=>globalThis.__write(...args); export const readSecureCache=k=>globalThis.__read(k); export const deleteSecureCache=k=>globalThis.__delete(k)',
  }
  const result = await build({ entryPoints: [path.resolve('src/store/index.ts')], bundle:true, platform:'node', format:'cjs', write:false, plugins:[{name:'adapters',setup(b){
    b.onResolve({filter:/.*/}, a => mocks[a.path] ? {path:a.path,namespace:'mock'} : undefined)
    b.onLoad({filter:/.*/,namespace:'mock'}, a=>({contents:mocks[a.path],loader:'js'}))
  }}]})
  const mod = new Module(path.resolve(__dirname,'native-cache-runtime.cjs'), module)
  mod.filename = path.resolve(__dirname,'native-cache-runtime.cjs'); mod.paths = module.paths
  mod._compile(result.outputFiles[0].text, mod.filename)
  const { useStore, flushMessageCache, hydrateEncryptedMessageCache } = mod.exports
  useStore.setState({user:{id:'a'},messages:{chat:[{id:'1',ciphertext:'wire',decrypted:'secret',signature_valid:true}]}})
  let done = false
  const first = flushMessageCache().then(()=>{done=true})
  await new Promise(resolve=>setImmediate(resolve))
  assert.equal(done,false,'flush must wait for native encryption')
  assert.equal(disk.size,0)
  const snapshot = JSON.parse(sealed[0].plaintext)
  assert.equal(snapshot.messages.chat[0].decrypted,undefined)
  assert.equal(snapshot.messages.chat[0].signature_valid,undefined)
  release(); await first
  assert.ok(disk.has('pp_msg_cache:v2:a'))
  assert.equal(local.has('pp_msg_cache'),false,'never create plaintext message cache')
  await hydrateEncryptedMessageCache('a')
  assert.equal(useStore.getState().messages.chat[0].ciphertext,'wire')
  fail=true
  const failed = flushMessageCache()
  await new Promise(resolve=>setImmediate(resolve)); release()
  await assert.rejects(failed,/disk failed/)
  fail=false
  const pending = flushMessageCache()
  await new Promise(resolve=>setImmediate(resolve))
  useStore.getState().logout()
  release(); await pending
  await new Promise(resolve=>setImmediate(resolve))
  assert.equal(disk.has('pp_msg_cache:v2:a'),false,'logout deletion follows any pending write')
  useStore.setState({user:{id:'b'},messages:{other:[]}})
  disk.set('pp_msg_cache:v2:a','sealed:'+JSON.stringify(snapshot))
  await hydrateEncryptedMessageCache('a')
  assert.deepEqual(useStore.getState().messages,{other:[]},'old hydration cannot replace the new account cache')
  console.log('PASS: native async cache, ciphertext-only persistence, write failure, logout ordering and account hydration isolation')
}
run().catch(error=>{console.error(error);process.exit(1)})
