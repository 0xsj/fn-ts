import pino from 'pino';

export interface PinoConfig {
  level: string;
  formatters: {
    level: (label: string) => { level: string };
    bindings: (bindings: pino.Bindings) => Record<string, any>;
  };
  timestamp: () => string;
  base: Record<string, any>;
  serializers: Record<string, pino.SerializerFn>;
  redact: string[];
  transport?: pino.TransportSingleOptions | pino.TransportMultiOptions;
}
