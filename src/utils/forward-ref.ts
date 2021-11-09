import { ForwardReferenceInterface } from '../contracts';

export const forwardRef = (fn: () => any): ForwardReferenceInterface => ({
  forwardRef: fn,
});
