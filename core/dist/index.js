// src/utils/uuid.ts
var uuid = () => [...Array(4)].map(() => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)).join("-");
var uuid_default = uuid;

// src/index.ts
var createExport = (target, adapter) => {
  adapter.onMessage(async (_message) => {
    if (_message.sender !== "import") return;
    const message = {
      ..._message,
      sender: "export"
    };
    switch (_message.type) {
      case "apply": {
        const mapArgs = _message.args.map((arg) => {
          if (_message.callbackIds?.includes(arg)) {
            return (...args) => {
              adapter.sendMessage({
                ..._message,
                id: arg,
                data: args,
                sender: "export"
              });
            };
          } else {
            return arg;
          }
        });
        try {
          message.data = await _message.path.reduce((acc, key) => acc[key], target).apply(
            target,
            mapArgs
          );
        } catch (error) {
          message.error = error.message;
        }
        break;
      }
    }
    adapter.sendMessage(message);
  });
};
var createImport = (context, adapter) => {
  const createProxy = (target, path) => {
    const proxy = new Proxy(target, {
      get(_target, key) {
        return createProxy(() => {
        }, [...path, key]);
      },
      apply(_target, _thisArg, args) {
        return new Promise((resolve, reject) => {
          try {
            const callbackIds = [];
            const mapArgs = args.map((arg) => {
              if (typeof arg === "function") {
                const callbackId = uuid_default();
                callbackIds.push(callbackId);
                adapter.onMessage((_message) => {
                  if (_message.sender !== "export") return;
                  if (_message.id !== callbackId) return;
                  arg(..._message.data);
                });
                return callbackId;
              } else {
                return arg;
              }
            });
            const message = {
              type: "apply",
              id: uuid_default(),
              path,
              sender: "import",
              callbackIds,
              args: mapArgs
            };
            adapter.onMessage((_message) => {
              if (_message.sender !== "export") return;
              if (_message.id !== message.id) return;
              _message.error ? reject(new Error(_message.error)) : resolve(_message.data);
            });
            adapter.sendMessage(message);
          } catch (error) {
            reject(error);
          }
        });
      }
    });
    return proxy;
  };
  return createProxy(context, []);
};
var exportProxy = (context, adapter) => (...args) => {
  return createExport(context(...args), adapter);
};
var importProxy = (_, adapter) => () => {
  return createImport(() => {
  }, adapter);
};
var defineProxy = (context, adapter) => {
  return [exportProxy(context, adapter), importProxy(context, adapter)];
};
var index_default = defineProxy;
export {
  index_default as default
};
//# sourceMappingURL=index.js.map