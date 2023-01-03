import os
import requests
import pandas as pd
import json
from requests.adapters import HTTPAdapter, Retry

def make_request(url):
    
    session = requests.Session()
    
    retry = Retry(connect=3, backoff_factor=0.5)
    
    adapter = HTTPAdapter(max_retries=retry)
    
    session.mount('http://', adapter)
    
    response = session.get(url)
    
    parsed = response.json()

    return parsed

def loadData():
    if not os.path.exists("data"):
        raise Exception("Please create and put all your vidoes in assets folder!")

    excel_list = os.listdir("data")

    if not os.path.exists("result"):
        os.mkdir("result")

    for excel in excel_list:
        name, ext = os.path.splitext(excel)
        if ext != ".xlsx":
            raise Exception("Please add xlsx files only!")

        output_name = name + ".xlsx"

    
    
    df = pd.read_excel("data/"+output_name)
    #Display top 5 rows to check if everything looks good
    # df.insert(4, 'resultado', ["resultado"])
    
    print(df.head(5))
    # print(df)
    respuesta = []
    cont = 0
    for data in df.values:
        if(data[0]==''):
            break
        if(not data[1].__contains__('/')):
            url = f"http://127.0.0.1:3030/{data[0]}&{data[1]}&{(0 if (data[2]=='ROUND TRIP') else 1)}"
            respuesta.append(make_request(url)['result'])
        else:
            respuesta.append('')

       
    # df = pd.DataFrame({'respuestas': respuesta})
    # dups = df.pivot_table(index=['respuestas'], aggfunc='size', )
    # print(dups)
    # dups.to_excel("result/"+output_name)
    df.insert(1, 'resultado', respuesta)
    print(df.head(5))
    # dups.to_excel("result/"+output_name)

    # os.startfile("result")

if __name__ == '__main__':
    loadData()






