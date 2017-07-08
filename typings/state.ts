export interface State {
    readonly components: {
        readonly [componentId: string]: any;
    };
}
