const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
        console.error(`AsyncHandler Error: ${err.message}`);
        next(err);
    });
};

export default asyncHandler;