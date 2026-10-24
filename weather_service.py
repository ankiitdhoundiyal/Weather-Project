# weather_service.py
import requests
import datetime
from sqlalchemy import create_engine, Column, Integer, Float, String, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
import google.generativeai as genai

# ---------- Config ----------
GEMINI_API_KEY = "YOUR_GEMINI_API_KEY"
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-1.5-flash')

GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"
WEATHER_URL = "https://api.open-meteo.com/v1/forecast"

# ---------- Database ----------
engine = create_engine('sqlite:///india_weather.db')
Base = declarative_base()

class WeatherRecord(Base):
    __tablename__ = 'weather_data'
    id = Column(Integer, primary_key=True)
    city_name = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    temperature = Column(Float)
    wind_speed = Column(Float)
    weather_code = Column(Integer)
    searched_at = Column(DateTime, default=datetime.datetime.utcnow)

Base.metadata.create_all(engine)
Session = sessionmaker(bind=engine)

# ---------- Core Functions ----------
def get_coordinates(place_name):
    params = {"name": place_name, "count": 1, "language": "en", "format": "json"}
    data = requests.get(GEOCODE_URL, params=params).json()
    if not data.get('results'):
        return None, None, None
    r = data['results'][0]
    return r['latitude'], r['longitude'], r['name']

def fetch_weather(lat, lon):
    params = {"latitude": lat, "longitude": lon, "current_weather": True, "timezone": "auto"}
    return requests.get(WEATHER_URL, params=params).json()

def get_ai_summary(city, weather_data):
    cw = weather_data['current_weather']
    prompt = (f"The current weather in {city} is {cw['temperature']}°C, "
              f"wind {cw['windspeed']} km/h, WMO code {cw['weathercode']}. "
              f"Write a 1-2 sentence friendly summary for an Indian user.")
    return model.generate_content(prompt).text

def search_weather(user_query):
    """Main entry point — call this from your old code."""
    lat, lon, name = get_coordinates(user_query)
    if not lat:
        return {"error": f"Location '{user_query}' not found."}

    weather = fetch_weather(lat, lon)
    cw = weather['current_weather']

    # Save to DB
    session = Session()
    session.add(WeatherRecord(
        city_name=name, latitude=lat, longitude=lon,
        temperature=cw['temperature'], wind_speed=cw['windspeed'],
        weather_code=cw['weathercode']
    ))
    session.commit()
    session.close()

    return {
        "city": name,
        "latitude": lat,
        "longitude": lon,
        "temperature": cw['temperature'],
        "wind_speed": cw['windspeed'],
        "weather_code": cw['weathercode'],
        "ai_summary": get_ai_summary(name, weather)
    }

def get_history(limit=10):
    """Fetch past searches from DB."""
    session = Session()
    rows = session.query(WeatherRecord).order_by(
        WeatherRecord.searched_at.desc()).limit(limit).all()
    session.close()
    return [
        {"city": r.city_name, "temp": r.temperature,
         "time": r.searched_at.strftime("%Y-%m-%d %H:%M")}
        for r in rows
    ]