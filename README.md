# API Data Dashboard

A modern, responsive web application for displaying data from any REST API endpoint. Built with vanilla HTML, CSS, and JavaScript.

## Features

- 🌐 **Universal API Support**: Works with any REST API that returns JSON data
- 🔍 **Real-time Search**: Filter data instantly as you type
- 📊 **Smart Data Display**: Automatically formats different data types
- 📱 **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- ⚡ **Fast & Lightweight**: No frameworks, pure vanilla JavaScript
- 🎨 **Modern UI**: Beautiful gradient design with smooth animations
- 📄 **Pagination**: Handle large datasets efficiently
- 🔄 **Error Handling**: Comprehensive error messages and loading states

## Quick Start

1. **Clone or download** this project to your local machine
2. **Open** `index.html` in your web browser
3. **Enter an API URL** (try the default example: `https://jsonplaceholder.typicode.com/posts`)
4. **Click "Fetch Data"** to load and display the API data

## Example API Endpoints

Here are some free APIs you can test with:

### JSONPlaceholder (Fake REST API)
- Posts: `https://jsonplaceholder.typicode.com/posts`
- Users: `https://jsonplaceholder.typicode.com/users`
- Comments: `https://jsonplaceholder.typicode.com/comments`
- Albums: `https://jsonplaceholder.typicode.com/albums`
- Photos: `https://jsonplaceholder.typicode.com/photos`

### GitHub API
- User info: `https://api.github.com/users/octocat`
- Repository info: `https://api.github.com/repos/microsoft/vscode`

### Other APIs
- HTTPBin JSON: `https://httpbin.org/json`
- Cat facts: `https://catfact.ninja/facts`
- Random quotes: `https://api.quotable.io/quotes`

## How to Use

### Basic Usage
1. Enter any API endpoint URL in the input field
2. Click the "Fetch Data" button
3. View the formatted data in the grid below

### Search & Filter
- Use the search box to filter data by any field
- Search works across all properties in the data

### Sorting
- Select a field from the "Sort by" dropdown
- Data will be sorted alphabetically or numerically

### Pagination
- Large datasets are automatically paginated
- Use Previous/Next buttons to navigate through pages

## Supported Data Formats

The dashboard automatically handles:

- **Arrays of objects**: `[{id: 1, name: "John"}, {id: 2, name: "Jane"}]`
- **Single objects**: `{id: 1, name: "John", email: "john@example.com"}`
- **Nested objects**: Objects with nested properties
- **Mixed data types**: Strings, numbers, booleans, arrays, objects

## Browser Compatibility

- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+

## File Structure

```
api-dashboard/
├── index.html          # Main HTML file
├── styles.css          # CSS styling
├── script.js           # JavaScript functionality
└── README.md           # This file
```

## Customization

### Styling
Edit `styles.css` to customize:
- Colors and gradients
- Fonts and typography
- Layout and spacing
- Animations and transitions

### Functionality
Edit `script.js` to add:
- Custom data formatting
- Additional API endpoints
- New filtering options
- Export functionality

## Common Issues

### CORS Errors
If you encounter CORS (Cross-Origin Resource Sharing) errors:
- Use APIs that support CORS
- Try using a CORS proxy service
- Test with APIs that explicitly allow cross-origin requests

### API Authentication
For APIs requiring authentication:
- Add headers in the `fetchData()` method
- Include API keys or tokens in the request
- Modify the fetch options in `script.js`

### Large Datasets
For very large datasets:
- The pagination system handles this automatically
- Consider implementing server-side pagination
- Add loading indicators for better UX

## Development

### Local Development
1. Open the project in your preferred code editor
2. Use a local server (like Live Server in VS Code) for development
3. Make changes and refresh the browser to see updates

### Adding New Features
The code is well-structured and commented. Key areas to modify:
- `APIDashboard` class in `script.js` for core functionality
- CSS classes in `styles.css` for styling
- HTML structure in `index.html` for layout changes

## License

This project is open source and available under the MIT License.

## Contributing

Feel free to submit issues, feature requests, or pull requests to improve this project.

---

**Happy API exploring! 🚀**
