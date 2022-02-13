import json
import time
from selenium import webdriver
from fake_useragent import UserAgent
from selenium.webdriver.chrome.options import Options

ua = UserAgent()
userAgent = 0
while (True):
    userAgent = ua.chrome
    if str(50) in userAgent:
        break
    
chrome_options = Options()

chrome_options.add_argument(f'user-agent={userAgent}')
# chrome_options.add_argument('--headless') 
# chrome_options.add_argument('log-level=3')
chrome_options.add_argument("no-default-browser-check")
chrome_options.add_argument("no-first-run")
driver = webdriver.Chrome(options=chrome_options)

MAIN_URL = "https://soap2day.sh/" #"https://s2dfree.to"

def soap2day():  
    # The site has some sort of bot detection, and may show multiple welcome pages before it lets you in.
    # This tries to click  the 'Home' button forever until you're allowed access
    driver.get(MAIN_URL)
    try:
        while(True):
            time.sleep(1)
            driver.execute_script('document.querySelector("#btnhome").click()')
    except:
        pass
    
    cookies = driver.get_cookies();
    headers = driver.execute_script("return navigator.userAgent;") + "|"
    # for i in cookies:
    #     headers += i['name'] + '=' + i['value'] + '; '
    cooks = json.dumps(cookies)
    print(headers)
    print(cooks)


if __name__ == "__main__":
    soap2day()
    # exit(0)