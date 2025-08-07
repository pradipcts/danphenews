// Middleware for advanced filtering, sorting, pagination, and selecting fields
// Usage: Pass the Mongoose model as parameter like advancedResults(Model)

export const advancedResults = (model) => async (req, res, next) => {
    try {
        let query;

        // Clone req.query for manipulation
        const reqQuery = { ...req.query };

        // Fields to exclude from filtering
        const removeFields = ['select', 'sort', 'page', 'limit'];

        // Remove fields
        removeFields.forEach(param => delete reqQuery[param]);

        // Create query string for filtering (e.g., ?price[gte]=10)
        let queryStr = JSON.stringify(reqQuery).replace(
            /\b(gt|gte|lt|lte|in)\b/g,
            match => `$${match}`
        );

        // Build query
        query = model.find(JSON.parse(queryStr));

        // Select specific fields
        if (req.query.select) {
            const fields = req.query.select.split(',').join(' ');
            query = query.select(fields);
        }

        // Sort by fields
        if (req.query.sort) {
            const sortBy = req.query.sort.split(',').join(' ');
            query = query.sort(sortBy);
        } else {
            query = query.sort('-createdAt');
        }

        // Pagination
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        query = query.skip(startIndex).limit(limit);

        // Execute query
        const results = await query;

        // Response structure
        const pagination = {};
        if (endIndex < await model.countDocuments()) {
            pagination.next = { page: page + 1, limit };
        }
        if (startIndex > 0) {
            pagination.prev = { page: page - 1, limit };
        }

        console.log('✅ Advanced Results Middleware Applied');

        res.advancedResults = {
            success: true,
            count: results.length,
            pagination,
            data: results
        };

        next();
    } catch (error) {
        console.error('❌ Error in advancedResults middleware:', error);
        res.status(500).json({ success: false, error: 'Server Error in advancedResults' });
    }
};
