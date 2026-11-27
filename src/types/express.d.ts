declare global {
  namespace Express {
    interface Request {
      user?: any;
      tenant?: any;
      supportSession?: any;
      platformAdmin?: any;
      requestId?: string;
    }
  }
}
export {};
