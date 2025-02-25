/**
  * @name "makerandstr"
  * @comment "Generates an random string of characters"
  * @author "xA_Emiloetjex"
  */
export function makerandstr(length: number): string {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-+=.,/:;~!@&*";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
/**
  * @name "mkRandStr2"
  * @comment "Generates an random string with the given characters"
  * @author "xA_Emiloetjex"
 */
export function mkRandStr2(length: number, chars: string): string {
  let result = "";
  const characters =
    chars;
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

let uniqueStore = []

export function UniqueGen(generator: (length: number) => string, length:number) {
  // console.log(uniqueStore)
  const newGen = generator(length);
  if (uniqueStore.includes(newGen)) return UniqueGen(generator, length)
  else {
    uniqueStore.push(newGen)
    return newGen
  }
}

export function decimalToHexString(number) {
  if (number < 0) {
    number = 0xffffffff + number + 1;
  }

  return number.toString(16).toUpperCase();
}

export function splitArray(array: any[], size: number): any[][] {
  let chunkSize = size;
  let chunks = [];

  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

// splitArray([1,2,3,4,5,6,7,8,9,10], 5)
// [
//   [1,2,3,4,5],
//   [6,7,8,9,10]
// ]

export function findMap(array, by, id) {
  console.log(by, id);

  let Target = 0;
  array.forEach((item, index) => {
    if (item[by] == id) return (Target = index);
    else return;
  });
  return Target;
}

export function removeFromArray(Arr: any[], Str: any): any[] {
  let WorkFlow;
  WorkFlow = Arr.join(",");
  WorkFlow = WorkFlow.replace("," + Str, "");
  WorkFlow = WorkFlow.split(",");
  return WorkFlow;
}
export function getFromArray(Arr: any[], ID: number): any {
  let temp_1;

  Arr.forEach((item, index) => {
    item.index = index;
    if (item.ID == ID) return (temp_1 = item);
    else return;
  });

  return temp_1;
}

export const ArrayManipulation = {
  splitArray,
  findMap,
  removeFromArray,
  getFromArray,
};
