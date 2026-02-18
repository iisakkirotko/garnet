export class DenseStore<T> {
  private values: (T | null)[];
  private freeIndices: number[] = [];

  constructor(initial?: T[]) {
    if (initial) {
      this.values = initial;
    } else {
      this.values = new Array<T>();
    }
  }

  public push(val: T) {
    const idx = this.freeIndices.pop();
    if (idx === undefined) {
      this.values.push(val);
      return;
    }
    this.values[idx] = val;
  }

  public remove(val: T | number) {
    let idx: number;
    let item: T;
    if (typeof val === "number") {
      idx = val;
      const fetched = this.values.at(idx);
      if (fetched === undefined || fetched === null) {
        throw new Error(
          `Tried to find element to remove in values, but it does not exist`,
        );
      }
      item = fetched;
    } else {
      item = val;
      idx = this.values.indexOf(val);
    }

    if (val === -1 || item === undefined) {
      throw new Error(
        `Tried to find element to remove in values, but it does not exist`,
      );
    }

    this.values[idx] = null;
    this.freeIndices.push(idx);
    return item;
  }

  public at(index: number) {
    return this.values.at(index);
  }

  public map(callbackfn: (value: T, index: number, array: T[]) => T[]) {
    const cleanValues = this.values.filter((value) => value !== null);
    return cleanValues.map(callbackfn);
  }

  public find(
    predicate: (value: T, index: number) => boolean | undefined,
  ): T | undefined {
    return this.values.find((value, index) => {
      if (value === null) {
        return false;
      }
      return predicate(value, index);
    }) as T | undefined;
  }

  public get length() {
    const cleanValues = this.values.filter((value) => value !== null);
    return cleanValues.length;
  }

  /**
   * Iterate through the dense set
   * @returns T
   */
  [Symbol.iterator]() {
    let index = 0;
    const items = this.values.filter((value) => value !== null);

    return {
      next(): IteratorResult<T> {
        if (index < items.length) {
          const item = items[index++];
          if (item === undefined) {
            throw new Error(
              `Got a undefined while iterating through dense set at index ${index}`,
            );
          }
          return { value: item, done: false };
        }
        return { value: undefined, done: true };
      },
    };
  }
}
