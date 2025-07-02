function formatTimestamp(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function formatResponse(statusCode, message, data = null, meta = null) {
    const timestamp = formatTimestamp(new Date());
    if (typeof statusCode !== 'number') {
        throw new Error('Status code must be a number');
    }

    const response = {
        status: statusCode,
        timestamp: timestamp,
        message: message,
    };

    response.data = data;

    if (meta) response.meta = meta;
    return response;
}

export default formatResponse;