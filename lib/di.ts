export interface DEPS {
    xLog: Function,
    collection: Function, /* firebase collection */
    snapshotToArray: Function,
}

export const container: DEPS = {
    xLog: null,
    collection: null,
    snapshotToArray: null,
};