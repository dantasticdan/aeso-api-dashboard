exports.handler = async (event, context) => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      apiKey: process.env.AESO_API_KEY || 'YOUR_API_KEY_HERE'
    })
  }
}
