import type { NextFunction, Request, RequestHandler, Response } from "express";

// Envuelve un handler async para mandar cualquier rechazo de promesa a next(), en vez de
// dejar el request colgado — Express 4 no captura errores async por default, así que un
// throw dentro de un handler `async` sin este wrapper nunca llega al middleware de error.
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}
