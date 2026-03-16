declare module 'input' {
    export function text(label: string): Promise<string>;
    export function password(label: string): Promise<string>;
    export function confirm(label: string): Promise<boolean>;
}
