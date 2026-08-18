export type PresentationCodecId = 'buddha' | 'chinese' | 'yijing' | 'hangul' | 'egyptian' | 'cuneiform' | 'values' | 'alphanumeric'
export const PRESENTATION_CODECS: Array<{ id: PresentationCodecId; label: string }> = [
  { id: 'buddha', label: '与佛论禅' }, { id: 'chinese', label: '随机中文' }, { id: 'yijing', label: '易经符号' },
  { id: 'hangul', label: '韩文' }, { id: 'egyptian', label: '埃及象形文字' }, { id: 'cuneiform', label: '楔形文字' },
  { id: 'values', label: '核心价值观文本' }, { id: 'alphanumeric', label: '英数字' },
]
const buddha = Array.from('南无萨怛他苏伽多耶阿啰诃帝三藐菩陀写佛俱胝瑟尼钐婆勃地跢鞞弊知喃娑舍迦僧卢鸡罗汉哆波那羯唎弥底提离赧悉毗奴揭摩跋因嚧乌般酰夜野拏槃遮慕剌目尸泥头阇茶输西刍沙吠柱补师毖怜捺母曳都瓢翳昙嚂视耽扬歧部叱你密儜盘叉突咤乏伐赭失若崩冰刹呼蓝难吉具战持迭税誓礼腾罔制喝质擅扇商乾啒菟折顿稚奢夷忏掘梵印兔么囘虎雍瞻药者点树室口隶罂曼薄主祇斫剑坛条私毕鸠荼单度播檀车社忙谜女比嗔讫担演埵达咄耆羊索四粹普钵什频泮牟素闼丹狼枳涩犁利继缚丁乂丈末婢迟蔑唠文逻五略布史颇闭宅袪革姥堙坠讬鼻绮钳佉惮迄栗邬常房盎建路凌喻敛肆引赖辫殊毘侄唵谤瓮莎')
const values = ['富强','民主','文明','和谐','自由','平等','公正','法治','爱国','敬业','诚信','友善']
function alphabet(id: PresentationCodecId): string[] {
  const range = (a:number,b:number) => Array.from({length:b-a+1},(_,i)=>String.fromCodePoint(a+i))
  if(id==='buddha') return buddha; if(id==='chinese') return range(0x4e00,0x9fa5); if(id==='yijing') return range(0x4dc0,0x4dff)
  if(id==='hangul') return range(0xac00,0xd7af); if(id==='egyptian') return range(0x13000,0x1342f)
  if(id==='cuneiform') return range(0x12000,0x1254f); if(id==='values') return values
  return Array.from('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ')
}
export function encodePresentationBytes(data: Uint8Array,id:PresentationCodecId):string {
  if(!data.length)return '';const chars=alphabet(id);let z=0;while(z<data.length&&data[z]===0)z++;if(z===data.length)return chars[0].repeat(z);const digits=[0];for(const byte of data.slice(z)){let carry=byte;for(let i=0;i<digits.length;i++){const v=digits[i]*256+carry;digits[i]=v%chars.length;carry=Math.floor(v/chars.length)}while(carry){digits.push(carry%chars.length);carry=Math.floor(carry/chars.length)}}return chars[0].repeat(z)+digits.reverse().map(d=>chars[d]).join('')
}
export function decodePresentationBytes(text:string,id:PresentationCodecId):Uint8Array {
  const chars=alphabet(id),map=new Map(chars.map((c,i)=>[c,i])),tokens=id==='values'?(text.match(/.{2}/gu)||[]):Array.from(text);let z=0;while(z<tokens.length&&tokens[z]===chars[0])z++;if(z===tokens.length)return new Uint8Array(z);const bytes=[0]
  for(const token of tokens.slice(z)){const digit=map.get(token);if(digit==null)throw new Error('Invalid presentation character');let carry=digit;for(let i=0;i<bytes.length;i++){const v=bytes[i]*chars.length+carry;bytes[i]=v&255;carry=Math.floor(v/256)}while(carry){bytes.push(carry&255);carry=Math.floor(carry/256)}}return new Uint8Array([...new Array(z).fill(0),...bytes.reverse()])
}
