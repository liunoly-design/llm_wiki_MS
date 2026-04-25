export const API_URL = "http://localhost:8000/api";

export const getHeaders = () => {
  const credentials = localStorage.getItem('wiki_credentials');
  return {
    'Content-Type': 'application/json',
    ...(credentials ? { 'Authorization': `Basic ${credentials}` } : {})
  };
};

export const fetchApi = async (endpoint, options = {}) => {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers
    }
  });

  if (response.status === 401) {
    localStorage.removeItem('wiki_credentials');
    window.location.reload();
  }

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  return response.json();
};
