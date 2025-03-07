// Constants
const API_KEY = '-fBU9z1TVoJpcZlFwwsWygcp1ZwRsoF3';
const API_BASE_URL = 'https://api.fm-track.com';
const DEMO_OBJECT_ID = '525f57c4-f1b8-11ef-97e7-eb022e586fe7';
const IS_DEVELOPMENT = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// DOM Elements
const loadingSpinner = document.getElementById('loadingSpinner');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const dataTableBody = document.getElementById('dataTableBody');
const filterBtn = document.getElementById('filterBtn');
const startDateInput = document.getElementById('startDate');
const endDateInput = document.getElementById('endDate');

// Helper Functions
const showLoading = () => loadingSpinner.classList.remove('hidden');
const hideLoading = () => loadingSpinner.classList.add('hidden');

const showError = (message, isWarning = false) => {
    errorText.textContent = message;
    errorMessage.classList.remove('hidden', 'bg-red-100', 'border-red-400', 'text-red-700', 'bg-yellow-100', 'border-yellow-400', 'text-yellow-700');
    errorMessage.classList.add(
        isWarning ? 'bg-yellow-100' : 'bg-red-100',
        isWarning ? 'border-yellow-400' : 'border-red-400',
        isWarning ? 'text-yellow-700' : 'text-red-700'
    );
};

const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const formatFuelLevel = (level) => `${Math.round(level)}%`;
const formatMileage = (miles) => `${Math.round(miles).toLocaleString()} mi`;

// Get mock data for development
const getMockData = (fromDate, toDate) => {
    const endDate = new Date(toDate);
    const data = [];
    
    // Generate 24 hours of data points
    for (let i = 0; i < 24; i += 2) {
        const currentTime = new Date(endDate - i * 60 * 60 * 1000);
        const fuelLevel = Math.max(0, Math.min(100, 85 - (i * 0.5))); // Decreasing fuel level
        const mileage = 12500 + (i * 50); // Increasing mileage
        
        data.push({
            object_id: DEMO_OBJECT_ID,
            fuel_level: fuelLevel,
            mileage: mileage,
            datetime: currentTime.toISOString()
        });
    }
    
    return data;
};

// Create table row for each record
const createTableRow = (data) => {
    const row = document.createElement('tr');
    row.className = 'hover:bg-gray-50 transition-colors duration-150';
    
    const fuelLevel = data.fuel_level || 0;
    const fuelColorClass = fuelLevel < 20 ? 'bg-red-600' : 
                          fuelLevel < 40 ? 'bg-yellow-500' : 
                          'bg-blue-600';
    
    row.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
            ${data.object_id}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            <div class="flex items-center">
                <div class="w-16 bg-gray-200 rounded-full h-2.5 mr-2">
                    <div class="${fuelColorClass} h-2.5 rounded-full transition-all duration-500 ease-in-out" style="width: ${data.fuel_level}%"></div>
                </div>
                ${formatFuelLevel(data.fuel_level)}
            </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            ${formatMileage(data.mileage)}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            ${formatDate(data.datetime)}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            <div class="flex space-x-3">
                <button 
                    onclick="showDetails('${data.object_id}')"
                    class="text-blue-600 hover:text-blue-900 tooltip transition-colors duration-150"
                >
                    <i class="fas fa-info-circle"></i>
                    <span class="tooltiptext">View Vehicle Details</span>
                </button>
                <button 
                    onclick="downloadReport('${data.object_id}')"
                    class="text-green-600 hover:text-green-900 tooltip transition-colors duration-150"
                >
                    <i class="fas fa-download"></i>
                    <span class="tooltiptext">Download Vehicle Report</span>
                </button>
            </div>
        </td>
    `;
    
    return row;
};

// Fetch device data
const fetchDeviceData = async (fromDate, toDate) => {
    if (IS_DEVELOPMENT) {
        return new Promise((resolve) => {
            setTimeout(() => {
                showError('Using demonstration data in development environment', true);
                resolve(getMockData(fromDate, toDate));
            }, 500); // Simulate network delay
        });
    }

    const url = `${API_BASE_URL}/objects/${DEMO_OBJECT_ID}/coordinates?version=2&from_datetime=${fromDate}&to_datetime=${toDate}&api_key=${API_KEY}&content-type=application/json;charset=UTF-8`;
    
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
};

// Fetch and display data
const fetchFuelData = async (startDate = null, endDate = null) => {
    try {
        showLoading();
        dataTableBody.innerHTML = '';

        const toDate = endDate ? new Date(endDate) : new Date();
        const fromDate = startDate ? new Date(startDate) : new Date(toDate - 24 * 60 * 60 * 1000);

        const deviceData = await fetchDeviceData(
            fromDate.toISOString(),
            toDate.toISOString()
        );
        
        if (deviceData && deviceData.length > 0) {
            const sortedData = deviceData.sort((a, b) => 
                new Date(b.datetime) - new Date(a.datetime)
            );

            sortedData.forEach(record => {
                dataTableBody.appendChild(createTableRow(record));
            });
        } else {
            const noDataRow = document.createElement('tr');
            noDataRow.innerHTML = `
                <td colspan="5" class="px-6 py-4 text-center text-gray-500">
                    No data available for the selected time period
                </td>
            `;
            dataTableBody.appendChild(noDataRow);
        }

    } catch (error) {
        console.error('Error:', error);
        showError('An error occurred while fetching the data. Please try again later.');
        
        // In development, show mock data even on error
        if (IS_DEVELOPMENT) {
            const mockData = getMockData(startDate, endDate);
            mockData.forEach(record => {
                dataTableBody.appendChild(createTableRow(record));
            });
        }
    } finally {
        hideLoading();
    }
};

// Show detailed information for a vehicle
const showDetails = (objectId) => {
    alert(`Detailed information for vehicle ${objectId} would be shown here in production environment.`);
};

// Download report for a vehicle
const downloadReport = (objectId) => {
    alert(`Report download for vehicle ${objectId} would be initiated in production environment.`);
};

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Set default date range (last 24 hours)
    const now = new Date();
    const yesterday = new Date(now - 24 * 60 * 60 * 1000);
    
    startDateInput.value = yesterday.toISOString().slice(0, 16);
    endDateInput.value = now.toISOString().slice(0, 16);

    // Initial data load
    fetchFuelData(startDateInput.value, endDateInput.value);

    // Filter button click handler
    filterBtn.addEventListener('click', () => {
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;

        if (!startDate || !endDate) {
            showError('Please select both start and end dates');
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            showError('Start date must be before end date');
            return;
        }

        fetchFuelData(startDate, endDate);
    });
});

// Error handling for API key
if (!API_KEY) {
    showError('API key is not configured. Please check your configuration.');
}
