from flask import Flask,render_template,json,jsonify,request
from pymongo import MongoClient

client = MongoClient('localhost:27017')
db = client.ReportData

application = Flask(__name__)

@application.route('/')
def showReportList():
    return render_template('feed.html')

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
    
if __name__ == "__main__":
    application.run(host='0.0.0.0')