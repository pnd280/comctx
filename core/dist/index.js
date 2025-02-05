// src/utils/uuid.ts
var uuid = () => [...Array(4)].map(() => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)).join("-");
var uuid_default = uuid;

// src/index.ts
var waitProvide = async (adapter) => {
  const offMessage = await new Promise((resolve, reject) => {
    const timer = setInterval(async () => {
      try {
        const id = uuid_default();
        adapter.sendMessage({
          type: "ping",
          id,
          path: [],
          sender: "inject",
          args: []
        });
        const offMessage2 = await adapter.onMessage((message) => {
          if (message.sender !== "provide") return;
          if (message.type !== "pong") return;
          if (message.id !== id) return;
          clearInterval(timer);
          offMessage2?.();
          resolve(offMessage2);
        });
      } catch (error) {
        clearInterval(timer);
        reject(error);
      }
    });
  });
  offMessage?.();
};
var createProvide = (target, adapter) => {
  adapter.onMessage(async (message) => {
    if (message.sender !== "inject") return;
    switch (message.type) {
      case "ping": {
        adapter.sendMessage({
          ...message,
          type: "pong",
          sender: "provide"
        });
        break;
      }
      case "apply": {
        const mapArgs = message.args.map((arg) => {
          if (message.callbackIds?.includes(arg)) {
            return (...args) => {
              adapter.sendMessage({
                ...message,
                id: arg,
                data: args,
                type: "apply",
                sender: "provide"
              });
            };
          } else {
            return arg;
          }
        });
        try {
          message.data = await message.path.reduce((acc, key) => acc[key], target).apply(
            target,
            mapArgs
          );
        } catch (error) {
          message.error = error.message;
        }
        adapter.sendMessage({
          ...message,
          type: "apply",
          sender: "provide"
        });
        break;
      }
    }
  });
  return target;
};
var createInject = (source, adapter) => {
  const createProxy = (target, path) => {
    const proxy = new Proxy(target, {
      get(target2, key) {
        return createProxy(source ? target2[key] : () => {
        }, [...path, key]);
      },
      apply(_target, _thisArg, args) {
        return new Promise(async (resolve, reject) => {
          try {
            await waitProvide(adapter);
            const callbackIds = [];
            const mapArgs = args.map((arg) => {
              if (typeof arg === "function") {
                const callbackId = uuid_default();
                callbackIds.push(callbackId);
                adapter.onMessage((_message) => {
                  if (_message.sender !== "provide") return;
                  if (_message.type !== "apply") return;
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
              sender: "inject",
              callbackIds,
              args: mapArgs
            };
            const offMessage = await adapter.onMessage((_message) => {
              if (_message.sender !== "provide") return;
              if (_message.type !== "apply") return;
              if (_message.id !== message.id) return;
              offMessage?.();
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
  return createProxy(source ?? (() => {
  }), []);
};
var provideProxy = (context) => {
  let target;
  return (adapter) => target ??= createProvide(context(), adapter);
};
var injectProxy = (context) => {
  let target;
  return (adapter) => target ??= createInject(context?.() ?? null, adapter);
};
var defineProxy = (context, backup = false) => {
  return [provideProxy(context), injectProxy(backup ? context : null)];
};
var index_default = defineProxy;
export {
  index_default as default
};
//# sourceMappingURL=index.js.map