from flask import Flask, jsonify, request
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'message': 'Backend is running'
    })

@app.route('/api/analyze', methods=['POST'])
def analyze_data():
    """
    Endpoint to analyze number patterns.
    You can add your Python ML code here.
    """
    data = request.get_json()
    numbers = data.get('numbers', [])

    # Basic analysis - you can add more sophisticated analysis here
    if not numbers:
        return jsonify({'error': 'No numbers provided'}), 400

    frequency = [0] * 10
    for num in numbers:
        if 0 <= num <= 9:
            frequency[num] += 1

    mean = sum(numbers) / len(numbers) if numbers else 0

    return jsonify({
        'count': len(numbers),
        'mean': round(mean, 2),
        'frequency': frequency,
        'last_digit': numbers[-1] if numbers else None
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3001))
    app.run(host='0.0.0.0', port=port, debug=True)
