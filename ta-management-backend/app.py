from flask import Flask, request, jsonify
import mysql.connector
from werkzeug.security import generate_password_hash, check_password_hash
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for all origins; adjust for production if needed

# Connect to MySQL
db = mysql.connector.connect(
    host="localhost",
    user="ta_user",
    password="helloTA",
    database="ta_management"
)
cursor = db.cursor()

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    
    # Debug: Print the incoming login data
    print("Received login data:", data)
    
    # Ensure both email and password are provided
    if 'email' not in data or 'password' not in data:
        return jsonify({"message": "Email and password are required"}), 400

    email = data['email']
    password = data['password']

    try:
        # Retrieve the user based on the provided email
        cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()

        # Check if user exists and if the password matches (password is at index 5)
        if user and check_password_hash(user[5], password):
            return jsonify({"message": "Logged in successfully!"}), 200
        else:
            return jsonify({"message": "Failed authentication. Please check your credentials."}), 401

    except mysql.connector.Error as err:
        return jsonify({"message": f"Database error: {err}"}), 500

if __name__ == "__main__":
    app.run(debug=True)
