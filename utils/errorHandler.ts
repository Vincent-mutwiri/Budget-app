export interface ApiError {
  message: string;
  code: string;
  details?: Record<string, any>;
}

export const handleApiError = (error: any, showToast?: (msg: string, type: string) => void): ApiError => {
  const apiError: ApiError = {
    message: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR'
  };

  if (error.response) {
    apiError.code = error.response.status.toString();
    apiError.message = error.response.data?.message || error.message;
    apiError.details = error.response.data;

    switch (error.response.status) {
      case 401:
        apiError.code = 'UNAUTHORIZED';
        apiError.message = 'Please sign in to continue';
        break;
      case 403:
        apiError.code = 'FORBIDDEN';
        apiError.message = 'You do not have permission to perform this action';
        break;
      case 404:
        apiError.code = 'NOT_FOUND';
        apiError.message = 'The requested resource was not found';
        break;
      case 500:
        apiError.code = 'SERVER_ERROR';
        apiError.message = 'Server error. Please try again later';
        break;
    }
  } else if (error.request) {
    apiError.code = 'NETWORK_ERROR';
    apiError.message = 'Connection failed. Please check your internet';
  }

  if (showToast) {
    showToast(apiError.message, 'error');
  }

  return apiError;
};