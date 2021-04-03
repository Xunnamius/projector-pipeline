export const ComponentActionError = class extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ComponentActionError';
  }
};

export const SkipCiError = class extends ComponentActionError {
  constructor(message: string) {
    super(message);
    this.name = 'SkipCiError';
  }
};

export const SkipCdError = class extends ComponentActionError {
  constructor(message: string) {
    super(message);
    this.name = 'SkipCdError';
  }
};
