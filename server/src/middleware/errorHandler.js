export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (err.name === "ZodError") {
    return res.status(400).json({
      message: "Ошибка валидации",
      issues: err.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message
      }))
    });
  }

  if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
    return res.status(409).json({ message: "Запись с таким значением уже существует" });
  }

  return res.status(500).json({
    message: "Внутренняя ошибка сервера",
    details: process.env.NODE_ENV === "production" ? undefined : err.message
  });
}
