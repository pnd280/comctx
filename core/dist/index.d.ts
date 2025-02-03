interface Message {
    type: 'apply';
    id: string;
    path: string[];
    sender: 'import' | 'export';
    callbackIds?: string[];
    args: any[];
    error?: string;
    data?: any;
}
interface Adapter {
    onMessage: (callback: (message: Message) => void) => void;
    sendMessage: (message: Message) => void;
}
declare const defineProxy: <T extends Record<string, any>>(context: () => T, adapter: Adapter) => readonly [<A>(...args: A[]) => void, () => T];

export { type Adapter, type Message, defineProxy as default };
