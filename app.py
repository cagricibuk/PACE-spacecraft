from flask import Flask, jsonify, render_template
import os

app = Flask(__name__)

@app.route('/', methods=['GET'])
def index():
    return render_template('index.html')  # Render the index.html

@app.route('/api/oem-files', methods=['GET'])
def get_oem_files():
    oem_dir = os.path.join('static', 'oem_files')
    oem_files = [f for f in os.listdir(oem_dir) if f.endswith('.oem')]
    return jsonify(oem_files)

if __name__ == '__main__':
    app.run(debug=True)
