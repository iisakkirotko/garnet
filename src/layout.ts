export class LayoutError extends Error {}

// TODO: how to implement auto layout?
export enum LayoutType {
  // auto,
  fullscreen,
  columns,
  rows,
  bento,
}

export type Layout = {
  name: string;
  version: number;
  columns: number | null;
  rows: number | null;

  windows: {
    width: number | null;
    height: number | null;
  }[];
};

export class LayoutManager {
  constructor() {
    this.validateLayouts();
  }

  public get(id: LayoutType) {
    switch (id) {
      // case LayoutType.auto:
      //   return {} as Layout;
      case LayoutType.fullscreen:
        return fullscreenLayout;
      case LayoutType.columns:
        return columnsLayout;
      case LayoutType.rows:
        return rowsLayout;
      case LayoutType.bento:
        return bentoLayout;
    }
  }

  /**
   * Loops through all layouts, and checks that they're valid.
   */
  public validateLayouts() {
    for (const id in LayoutType) {
      const cleanId = Number(id);
      if (isNaN(cleanId)) return;
      this.validate(cleanId);
    }
  }

  public validate(id: LayoutType) {
    const layout = this.get(id);

    if (layout === undefined) {
      throw new LayoutError(`Layout for key ${id} is undefined`);
    }
    if (layout.columns === null && layout.rows === null) {
      throw new LayoutError(
        `Error validating layout ${layout.name}: Either rows or columns have to be given.`,
      );
    }

    const allWidths = layout.windows.every((window) => window.width !== null);
    const anyWidths = layout.windows.some((window) => window.width !== null);
    const allHeights = layout.windows.every((window) => window.height !== null);
    const anyHeights = layout.windows.some((window) => window.height !== null);

    if (layout.columns === null && anyWidths) {
      throw new LayoutError(
        `Error validating layout ${layout.name}: If layout.columns is null, every window's width value has to also be null`,
      );
    }
    if (layout.rows === null && anyHeights) {
      throw new LayoutError(
        `Error validating layout ${layout.name}: If layout.rows is null, every window's height value has to also be null`,
      );
    }

    if (layout.columns !== null) {
      const tooWide = layout.windows.some(
        (window) => window.width && window.width > layout.columns!,
      );
      if (tooWide) {
        throw new LayoutError(
          `Error validating layout ${layout.name}: At least one window is wider than the maximum number of columns ${layout.columns}`,
        );
      }
    }
    if (layout.rows) {
      const tooTall = layout.windows.some(
        (window) => window.height && window.height > layout.rows!,
      );
      if (tooTall) {
        throw new LayoutError(
          `Error validating layout ${layout.name}: At least one window is taller than the maximum number of rows ${layout.rows}`,
        );
      }
    }
  }

  /**
   * Calculates how many columns or rows are required to fulfill the layout.
   * @param missing Which direction are we trying to fill.
   * @param layout The current layout
   * @param windows the number of windows we are rendering
   */
  public calcFill(
    missing: "width" | "height",
    layout: Layout,
    windows: number,
  ): number {
    console.log(
      `Calculating fill parameters for ${windows} windows for layout ${layout.name}`,
    );
    const other = missing === "width" ? "height" : "width";
    // The number of units in the other direction. Should be definite, otherwise the layout is invalid.
    const otherCount: number | null =
      missing === "width" ? layout.rows : layout.columns;
    if (otherCount === null) {
      throw new LayoutError(
        `Both rows and columns are null for layout ${layout.name}`,
      );
    }

    let acc = 0;
    let otherAcc = 0;
    for (let i = 0; i < windows; i++) {
      const win = layout.windows[i]!;
      const otherGrowth = win[other];
      if (otherGrowth === null) {
        throw new LayoutError(
          `Invalid layout: Found null ${other} for layout ${layout.name} when ${other}s should all be defined.`,
        );
      }
      otherAcc += otherGrowth;
      if (otherAcc < otherCount) {
        continue;
      }
      if (otherAcc >= otherCount) {
        acc += 1;
        otherAcc = 0;
      }
    }

    return acc;
  }
}

const fullscreenLayout: Layout = {
  name: "fullscreen",
  version: 1,
  columns: 1,
  rows: 1,

  windows: [
    {
      width: 1,
      height: 1,
    },
  ],
};

const columnsLayout: Layout = {
  name: "columns",
  version: 1,
  columns: null,
  rows: 1,

  windows: [
    {
      width: null,
      height: 1,
    },
  ],
};

const rowsLayout: Layout = {
  name: "rows",
  version: 1,
  columns: 1,
  rows: null,

  windows: [{ width: 1, height: null }],
};

const bentoLayout: Layout = {
  name: "bento",
  version: 1,
  columns: 3,
  rows: 2,

  windows: [
    { width: 2, height: 2 },
    { width: 1, height: 1 },
    { width: 1, height: 1 },
  ],
};
