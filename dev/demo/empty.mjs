// Stub for Node-only modules (file system, SMTP) that the browser demo never calls.
const stub = () => { throw new Error("Not available in the browser demo"); };
export default { createTransport: stub, mkdir: stub, writeFile: stub, join: (...p) => p.join("/") };
export const mkdir = stub, writeFile = stub, join = (...p) => p.join("/"), createTransport = stub;
