from flask import Flask,render_template,json,jsonify,request,redirect,session
from pymongo import MongoClient
from flask_moment import Moment
from twilio.rest import TwilioRestClient
import twilio.twiml
import datetime
import uuid
import re

client = MongoClient('localhost:27017')
db = client.ReportData

application = Flask(__name__)
application.secret_key = 'Bo\xaa]txn\xee\x8f\xb1\x15\x02s\xb8=JQS|\xe0\x15\xf4\x1d\x08'

moment = Moment(application)

@application.route('/')
def showReportList():
    return render_template('feed.html')

@application.route('/<location>')
def showLocationReportList(location):
    return render_template('location_feed.html')
    
@application.route('/<location>/getReports',methods=['POST'])
def getLocationReports(location):
    try:
        reports = db.Reports.find({'location': location})
        reportList = []
        for report in reports:
            reportItem = {
                    'description':report['description'],
                    'location':report['location']
                    }
            reportList.append(reportItem)
    except Exception,e:
        return str(e)
    return json.dumps(reportList)
    
@application.route("/createReport", methods=['POST'])
def createReport():
    try:
        json_data = request.json['info']
        reportDescription = json_data['description']
        reportLocation = json_data['location']

        db.Reports.insert_one({
            'description':reportDescription, 'location':reportLocation
            })
        return jsonify(status='OK', message='successfully added to the database')
    except Exception,e:
        return jsonify(status='ERROR',message=str(e))

@application.route("/getReports",methods=['POST'])
def getReports():
    try:
        reports = db.Reports.find()
        reportList = []
        for report in reports:
            reportItem = {
                    'description':report['description'],
                    'location':report['location']
                    }
            reportList.append(reportItem)
    except Exception,e:
        return str(e)
    return json.dumps(reportList)
    
@application.route("/receiveIncomingReport",methods=['GET', 'POST'])
def createReportFromText():
    """Respond to incoming calls with a simple text message."""
    
    # session = request.session
    mid_post = session.get('mid_post_id')
    
    if not mid_post:
        try:
            session['from_num'] = request.values.get('From')
            session['message_body'] = request.values.get('Body')
            session['time_received'] = request.values.get('DateCreated')
            
            # db.Reports.insert_one({
            #     'description':message_body, 'location':location, 'time_received':time_received, 'owner':from_num
            #     })
            session['mid_post_id'] = uuid.uuid4()
            resp = twilio.twiml.Response()
            resp.message("What zip code did the incident occur in?")
            return str(resp)
        except Exception,e:
            resp = twilio.twiml.Response()
            resp.message("Sorry, there was an issue creating your report. Please try again! " + str(e) )
            return str(resp)
    else:
        try:
            full_location = request.values.get('Body')
            zip_code = re.search('(\d{5})([- ])?(\d{4})?', full_location)
            from_num = session['from_num']
            message_body = session['message_body']
            time_received = session['time_received']
            if zip_code is None:
                resp = twilio.twiml.Response()
                resp.message("Sorry, looks like you didn't include a zip code. Please re-send your location with a 5-digit zip-code included.")
                return str(resp)
            else:
                try:
                    zip_code = zip_code.group(0)
                    db.Reports.insert_one({
                        'description':message_body, 'full_location':full_location, 'location': zip_code, 'time_received':time_received, 'owner':from_num
                        })
                    session.clear()
                    resp = twilio.twiml.Response()
                    resp.message("Your post was made successfully. Thank you for seeing hate and calling it out - keep it up!")
                    return str(resp)
                except Exception,e:
                    resp = twilio.twiml.Response()
                    resp.message("Sorry, there was an issue creating your report. Please send your location, again!" + str(e))
                    return str(resp)
                    
        except Exception,e:
            resp = twilio.twiml.Response()
            resp.message("Sorry, there was an issue creating your report. Please send your location, again!" + str(e) )
            return str(resp)
    
if __name__ == "__main__":
    application.run(host='0.0.0.0')