from flask import Flask,render_template,json,jsonify,request,redirect,session
from pymongo import MongoClient
from flask_moment import Moment
from twilio.rest import TwilioRestClient
import twilio.twiml
import datetime

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
    
    try:
        from_num = request.values.get('From')
        message_body = request.values.get('Body')
        time_received = request.values.get('DateCreated')
        message_split = message_body.split('#')
        location = message_split[1]
        
        db.Reports.insert_one({
            'description':message_body, 'location':location, 'time_received':time_received, 'owner':from_num
            })
        resp = twilio.twiml.Response()
        resp.message("Your post was made successfully. Thank you for seeing hate and calling it out - keep it up.")
        return str(resp)
    except Exception,e:
        resp = twilio.twiml.Response()
        resp.message("Sorry, there was an issue creating your report. Make sure your zipcode is included at the end of your message in this format: #12345 or - " + str(e) )
        return str(resp)
    
if __name__ == "__main__":
    application.run(host='0.0.0.0')