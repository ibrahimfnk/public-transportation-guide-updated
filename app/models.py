from app import db

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)
    favorites = db.relationship('Favorite', backref='user', lazy=True)
    trips = db.relationship('Trip', backref='user', lazy=True)

class Location(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    favorites = db.relationship('Favorite', backref='location', lazy=True)
    start_trips = db.relationship('Trip', foreign_keys='Trip.start_location_id', backref='start_location', lazy=True)
    end_trips = db.relationship('Trip', foreign_keys='Trip.end_location_id', backref='end_location', lazy=True)

class Favorite(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    location_id = db.Column(db.Integer, db.ForeignKey('location.id'), nullable=False)

class Trip(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    start_location_id = db.Column(db.Integer, db.ForeignKey('location.id'), nullable=False)
    end_location_id = db.Column(db.Integer, db.ForeignKey('location.id'), nullable=False)
    transport_mode = db.Column(db.String(20), nullable=False)
    distance = db.Column(db.Float, nullable=False)
    carbon_footprint = db.Column(db.Float, nullable=False)