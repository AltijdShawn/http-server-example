import { errorHandler } from "./errorHandler.js";

export const mapStore = new Map<string, string>();

export const cache = {
  set: async (key: string, value: string) => {
    mapStore.set(key, value);
    setTimeout(() => mapStore.delete(key), 10000);
  },
  get: (key: string) => mapStore.get(key),
  delete: (key: string) => mapStore.delete(key),
};

export async function Cache(
  name: string,
  cachingCb: (...args: any[]) => any | Promise<any>
) {
  let result;
  let isCached = false;
  try {
    const cacheResult = cache.get(`${name}`);
    if (cacheResult) {
      isCached = true;
      result = JSON.parse(cacheResult);
    } else {
      result = await cachingCb();
      if (result.length === 0) {
        errorHandler.cache.unAssignable(
          new Error(`cache not found and could not be constructed`)
        );
      }
      cache.set(`${name}`, JSON.stringify(result));
    }

    // errorHandler.cache.failed([result, isCached]);

    return {
			isCached,
      status: "success",
      data: result,
    };
  } catch (e) {
    // console.log(e);
    return {
			isCached,
      status: "failed",
      data: errorHandler.cache.failed(e),
    };
  }
}
