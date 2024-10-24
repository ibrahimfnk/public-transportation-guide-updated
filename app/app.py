from flask import Flask, render_template, redirect, url_for, request, flash, session, jsonify
from flask_bcrypt import Bcrypt
from flask_wtf import FlaskForm
from wtforms import StringField,PasswordField,SubmitField
from wtforms.validators import DataRequired, Email
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import func
from flask_migrate import Migrate
import re
from datetime import datetime
from sqlalchemy.exc import IntegrityError






app = Flask(__name__)
app.config.from_object('config.Config')

bcrypt = Bcrypt(app)
db = SQLAlchemy(app)
migrate = Migrate(app, db)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)
    trips = db.relationship('Trip', backref='user', lazy=True)

class Location(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    location_type = db.Column(db.String(10), nullable=False)
    start_trips = db.relationship('Trip', foreign_keys='Trip.start_location_id', backref='start_location', lazy=True)
    end_trips = db.relationship('Trip', foreign_keys='Trip.end_location_id', backref='end_location', lazy=True)



class Trip(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    start_location_id = db.Column(db.Integer, db.ForeignKey('location.id'), nullable=False)
    end_location_id = db.Column(db.Integer, db.ForeignKey('location.id'), nullable=False)
    transport_mode = db.Column(db.String(200), nullable=False)
    distance = db.Column(db.Float, nullable=False)
    carbon_footprint_public = db.Column(db.Float, nullable=False)
    carbon_footprint_private = db.Column(db.Float, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)



with app.app_context():
    db.create_all()


class RegisterForm(FlaskForm):
    username = StringField("Username", validators=[DataRequired()])
    email = StringField("Email", validators=[DataRequired(), Email()])
    password = PasswordField("Password", validators=[DataRequired()])
    submit = SubmitField("Submit")


class LoginForm(FlaskForm):
    username = StringField("Username", validators=[DataRequired()])
    password = StringField("Password", validators=[DataRequired()])
    submit = SubmitField("Submit")


faqs = {
    "What are the operating hours?": "Our services operate from 5 AM to 11 PM daily.",
    "How do I contact customer service?": "You can reach customer service at 123-456-7890.",
    "Is there a student discount?": "Yes, students can get a 20% discount on tickets.",
    "Where can I buy tickets?": "Tickets can be purchased online or at any ticket booth.",
    "Are there any routes to downtown?": "Yes, several routes go to downtown. Please check our website for details."
}
keyword_responses = {
    "refund": "You can request a refund within 30 days of purchase. Please contact customer service for assistance.",
    "lost": "If you lost an item, please visit our Lost and Found section at the main office.",
    "feedback": "We appreciate your feedback! You can send your comments to feedback@ourcompany.com.",
    "delay": "We apologize for any delays. Please check our website for real-time updates on schedules."
}

def bot_response(query):
    """Provides a response to the user's query."""

    # Convert query to lowercase for case-insensitive matching
    query = query.lower()
     
       # Check if the query contains any keywords
    for keyword in keyword_responses.keys():
        if re.search(r'\b' + re.escape(keyword) + r's?\b', query):  # Match keyword or its plural
            return keyword_responses[keyword]



    # Check if the query matches any FAQ
    for question, answer in faqs.items():
        if question.lower() in query:
            return answer

    # If no match found, provide a generic response
    return "I couldn't find an answer to that. Please try asking a different question."

@app.route("/")
@app.route("/home")
def index():
     # Call the function from bot.py to get the message
    if 'username' in session:
        return render_template('index.html', username=session['username'])
    else:
        return render_template('index.html')
@app.route('/ask', methods=['POST'])
def ask():
    query = request.form['query']
    response = bot_response(query)  # Process the query and get response
    return jsonify(response=response)

@app.route("/login", methods=['GET', 'POST'])
def login():
    form = LoginForm()
    if form.validate_on_submit():
        username = form.username.data
        password = form.password.data

        user = User.query.filter_by(username=username).first()

        if user and bcrypt.check_password_hash(user.password, password):
            session['id'] = user.id  # Save the user's ID in the session
            return redirect(url_for('dashboard'))
        else:
            flash("Login Failed! Please check Username and Password")
            return redirect(url_for('login'))

        
    return render_template('login.html', form=form)
    

    
   


@app.route("/register", methods=['GET', 'POST'])
def register():
    form = RegisterForm()
    if form.validate_on_submit():
        username = form.username.data
        email = form.email.data
        password = form.password.data

        # Check if the email already exists
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            flash("Email already exists. Please use a different email.", "danger")
            return render_template('register.html', form=form)

        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')

        # Store into database
        form_data = User(username=username, email=email, password=hashed_password)
        db.session.add(form_data)

        try:
            db.session.commit()
            return redirect(url_for('login'))
        except IntegrityError:
            db.session.rollback()  # Rollback to avoid further errors
            flash("There was an issue registering. Please try again.", "danger")
            return redirect(url_for('register'))

    return render_template('register.html', form=form)


@app.route('/logout')
def logout():
    # Clear the session data
    session.clear()
    flash('You have been logged out.', 'success')
    return redirect(url_for('login'))

@app.route("/about")
def about():
    return render_template('about.html')

@app.route('/dashboard')
def dashboard():
    if 'id' not in session:
        return redirect(url_for('login'))
    
    id = session['id']
    user = User.query.filter_by(id = id).first()
    if user:
        return render_template('new_dashboard.html', user = user)
    
@app.route("/statistics")
def statistics():
    return render_template('statistics.html')
    

@app.route('/save_trip', methods=['POST'])
def save_trip():
    try:
        data = request.get_json()
        user_id = session.get('id')

        # Check if user is logged in
        if not user_id:
            return jsonify({"error": "User is not logged in"}), 403

        # Extract start and end locations from data
        start_location_data = data.get('start_location')
        end_location_data = data.get('end_location')

        # Check if location data is present
        if not start_location_data or not end_location_data:
            return jsonify({"error": "Missing location data"}), 400
        
        # Debugging: Print received location data
        print(f"Received Start Location Data: {start_location_data}")
        print(f"Received End Location Data: {end_location_data}")

        # Query or create start location
        start_location = Location.query.filter_by(
            latitude=start_location_data['latitude'],
            longitude=start_location_data['longitude']
        ).first()
        if not start_location:
            start_location = Location(
                name=start_location_data['name'],
                latitude=start_location_data['latitude'],
                longitude=start_location_data['longitude'],
                location_type='from'
            )
            db.session.add(start_location)
            db.session.commit()

        # Query or create end location
        end_location = Location.query.filter_by(
            latitude=end_location_data['latitude'],
            longitude=end_location_data['longitude']
        ).first()
        if not end_location:
            end_location = Location(
                name=end_location_data['name'],
                latitude=end_location_data['latitude'],
                longitude=end_location_data['longitude'],
                location_type='to'
            )
            db.session.add(end_location)
            db.session.commit()

        # Debugging: Print location IDs
        print(f"Start Location ID: {start_location.id}")
        print(f"End Location ID: {end_location.id}")

        # Save trip data
        trip = Trip(
            user_id=user_id,
            start_location_id=start_location.id,
            end_location_id=end_location.id,
            transport_mode=data['transport_mode'],
            distance=data['distance'],
            carbon_footprint_public=data['carbon_footprint'],
            carbon_footprint_private=data['carbon_footprint_private']
        )
        db.session.add(trip)
        db.session.commit()

        return jsonify({"message": "Trip saved successfully"})

    except Exception as e:
        print(f"Error saving trip: {e}")  # Log error for debugging
        return jsonify({"error": "An error occurred while saving the trip"}), 500

# API Routes

@app.route('/api/trip_summary', methods=['GET'])
def trip_summary():
    user_id = session.get('id')
    if not user_id:
        return jsonify({"error": "User not logged in"}), 403

    total_trips = Trip.query.filter_by(user_id=user_id).count()
    total_distance = db.session.query(func.sum(Trip.distance)).filter_by(user_id=user_id).scalar() or 0
    average_distance = db.session.query(func.avg(Trip.distance)).filter_by(user_id=user_id).scalar() or 0

    transport_modes = db.session.query(Trip.transport_mode, func.count(Trip.transport_mode))\
        .filter_by(user_id=user_id)\
        .group_by(Trip.transport_mode).all()
    transport_mode_breakdown = {mode: count for mode, count in transport_modes}

    return jsonify({
        "total_trips": total_trips,
        "total_distance": total_distance,
        "average_distance": average_distance,
        "transport_mode_breakdown": transport_mode_breakdown
    })

@app.route('/api/carbon_footprint', methods=['GET'])
def carbon_footprint():
    user_id = session.get('id')
    if not user_id:
        return jsonify({"error": "User not logged in"}), 403

    total_carbon_public = db.session.query(func.sum(Trip.carbon_footprint_public)).filter_by(user_id=user_id).scalar() or 0
    total_carbon_private = db.session.query(func.sum(Trip.carbon_footprint_private)).filter_by(user_id=user_id).scalar() or 0

    return jsonify({
        "carbon_footprint_public": total_carbon_public,
        "carbon_footprint_private": total_carbon_private
    })

@app.route('/api/frequent_destinations', methods=['GET'])
def frequent_destinations():
    user_id = session.get('id')
    if not user_id:
        return jsonify({"error": "User not logged in"}), 403

    top_destinations = db.session.query(
        Location.name, func.count(Trip.id)
    ).join(Trip, Trip.end_location_id == Location.id)\
     .filter(Trip.user_id == user_id)\
     .group_by(Location.id)\
     .order_by(func.count(Trip.id).desc())\
     .limit(5).all()

    return jsonify({
        "top_destinations": [{"name": name, "count": count} for name, count in top_destinations]
    })





if __name__ == "__main__":
    app.run(debug=True)
    
