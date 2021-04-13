export const ComponentActionError = class extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'ComponentActionError';
  }
};
