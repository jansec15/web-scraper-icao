import os
import requests
import pandas as pd
import json
from requests.adapters import HTTPAdapter, Retry
import time


BASE_DIR = os.path.dirname(os.path.abspath(__file__))+"/"


def make_request(url):

    session = requests.Session()

    retry = Retry(connect=3, backoff_factor=0.5)

    adapter = HTTPAdapter(max_retries=retry)

    session.mount('http://', adapter)

    response = session.get(url)

    parsed = response.json()

    return parsed


def loadData():

    if not os.path.exists(BASE_DIR+"data"):
        raise Exception(
            "Please create and put all your vidoes in assets folder!")

    excel_list = os.listdir(BASE_DIR+"data")

    if not os.path.exists(BASE_DIR+"result"):
        os.mkdir(BASE_DIR+"result")

    for excel in excel_list:
        name, ext = os.path.splitext(excel)
        if ext != ".xlsx":
            raise Exception("Please add xlsx files only!")

        output_name = name + ".xlsx"

    df = pd.read_excel(BASE_DIR+"data/"+output_name)
    # Display top 5 rows to check if everything looks good
    # df.insert(4, 'resultado', ["resultado"])

    # print(df.head(5))
    # print(df)
    respuesta = []
    error = False
    count = 0
    resp = ''
    restante = len(df.values)
    for data in df.values:
        if (data[0] == ''):
            break
        if ((not data[1].__contains__('/')) and (not error)):

            url = f"http://127.0.0.1:3030/{data[0]}&{data[1]}&{(0 if (data[2]=='ROUND TRIP') else 1)}"
            try:
                resp = make_request(url)['result']
                respuesta.append(resp if resp != None else "")
            except:
                error = True
                respuesta.append("")
            print([data, resp])
        else:
            respuesta.append('')
        restante -= 1
        progreso = (len(df.values)-restante)*100/len(df.values)
        print(f"faltan por procesar {restante} - progreso %{progreso:.2f}")
        # count += 1
        # if (count > 15 and (not error)):
        #     restante -=count
        #     for i in range(1, 30):
        #         print(f"esperando... {i}")
        #         time.sleep(1)
        #     progreso = (len(df.values)-restante)*100/len(df.values)
        #     print(f"faltan por procesar {restante} - progreso %{progreso:.2f}")
        #     count = 0
    # df = pd.DataFrame({'respuestas': respuesta})
    # dups = df.pivot_table(index=['respuestas'], aggfunc='size', )
    # print(dups)
    # dups.to_excel("result/"+output_name)
    df.insert(3, 'resultado', respuesta)
    # dups.to_excel("result/"+output_name)
    df.to_excel(BASE_DIR+"result/"+output_name)

# os.startfile(BASE_DIR+"result")


if __name__ == '__main__':
    loadData()
