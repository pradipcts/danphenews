class ApiResponse {
    constructor({
        statusCode = 200,
        data = null,
        message = null,
        results = null
    }) {
        this.statusCode = statusCode;
        this.data = data;
        this.message = message;
        this.results = results;
        this.success = statusCode < 400;
    }

    send(res) {
        const response = {
            success: this.success,
            ...(this.message && { message: this.message }),
            ...(this.data && { data: this.data }),
            ...(this.results && { results: this.results })
        };

        return res.status(this.statusCode).json(response);
    }
}

export default ApiResponse;