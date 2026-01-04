from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select
from selenium.common.exceptions import NoSuchElementException
import time
import csv
import json

# --- Configuration ---
# Load credentials from config file
with open('data/lsa-cg-config.json', 'r') as f:
    config = json.load(f)
    UNIQNAME = config['uniqname']
    PASSWORD = config['password']
    WINTER_TERM = config["winter_term"]
    FALL_TERM = config["fall_term"]

# Initialize Driver (ensure you have the correct driver installed, e.g., chromedriver)
driver = webdriver.Chrome()


def login():
    # Check if we are already logged in (look for logout button or similar)
    print("Checking login status...")
    try:
        driver.find_element(By.ID, "username")
        pass
    except NoSuchElementException:
        print("Already logged in.")
        return

    print("Logging in...")
    user_field = WebDriverWait(driver, 5).until(
        EC.presence_of_element_located((By.ID, "username")))
    pass_field = driver.find_element(By.ID, "password")

    user_field.send_keys(UNIQNAME)
    pass_field.send_keys(PASSWORD)

    # Click Login (Usually redirects to Weblogin)
    # The Course Guide has a 'Log In' link in the top right
    login_btn = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.ID, "loginSubmit"))
    )
    login_btn.click()

    # --- NOTE ON DUO 2FA ---
    # At this point, the script will likely hang if Duo is required.
    # You must manually approve the push on your phone.
    print("Please approve the Duo 2FA push on your device...")
    remember_device_btn = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.ID, "trust-browser-button"))
    )
    remember_device_btn.click()


def get_subjs():
    subjs = set()

    categories = [
        # Undergrad subjects
        f"https://webapps.lsa.umich.edu/cg/cg_subjectlist.aspx?termArray={WINTER_TERM}&cgtype=ug&allsections=true",
        # f"https://webapps.lsa.umich.edu/cg/cg_subjectlist.aspx?termArray={TERM}&cgtype=gr&allsections=true" # Grad subjects
    ]

    for cat in categories:
        driver.get(cat)
        login()
        tbody = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.TAG_NAME, "tbody")))
        rows = tbody.find_elements(By.TAG_NAME, "tr")
        for row in rows:
            subj_code, description = row.find_elements(By.TAG_NAME, "td")
            description_text = description.text.strip()
            if description_text.startswith("LSA") or description_text.startswith("ENG"):
                subjs.add(subj_code.text.strip())

    return list(subjs)


def get_courses_for_subj(subj_code):
    driver.get(
        f"https://webapps.lsa.umich.edu/cg/cg_results.aspx?termArray={WINTER_TERM}&termArray={FALL_TERM}&cgtype=ug&cgtype=gr&show=20&department={subj_code}")
    login()
    subj_courses = []
    while True:
        # Wait for the list of courses to load
        WebDriverWait(driver, 20).until(
            EC.presence_of_element_located((By.CLASS_NAME, "ClassHyperlink"))
        )

        # Get the number of courses on the current page
        course_elements = driver.find_elements(By.CLASS_NAME, "ClassHyperlink")
        num_courses = len(course_elements)
        print(f"Found {num_courses} courses on this page.")

        for i in range(num_courses):
            course_elements = driver.find_elements(
                By.CLASS_NAME, "ClassHyperlink")
            if i >= len(course_elements):
                break

            course_link = course_elements[i]
            course_link.click()

            # Wait for the details page to load
            try:
                WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located(
                        (By.ID, "contentMain_lblSubject"))
                )

                course_subj = driver.find_element(
                    By.ID, "contentMain_lblSubject").text.strip()
                course_number = driver.find_element(
                    By.ID, "contentMain_lblCatNo").text.strip()
                course_title = driver.find_element(
                    By.ID, "contentMain_lblLongTitle").text.strip()
                course_subtitle = driver.find_element(
                    By.ID, "contentMain_lblSubtitle").text.strip()
                description = driver.find_element(
                    By.ID, "contentMain_lblDescr").text.strip()
                if "Course Requirements:" in description:
                    description = description.split(
                        "Course Requirements:")[0].strip()

                course_name = course_title
                if course_subtitle:
                    course_subtitle = course_subtitle.lstrip("-").strip()
                    course_name += f": {course_subtitle}"
                print(
                    f"Scraped: {course_subj} {course_number} - {course_name}")

                course_info = (course_subj, course_number,
                               course_name, description)
                # Skip courses with the same code and name as the last one added.
                if subj_courses and course_info[0] == subj_courses[-1][0] and course_info[1] == subj_courses[-1][1]:
                    pass
                else:
                    subj_courses.append(course_info)
            except Exception as e:
                print(f"Error scraping course at index {i}: {e}")

            driver.back()

            # Wait for the list to reload before continuing
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located(
                    (By.CLASS_NAME, "ClassHyperlink"))
            )

        try:
            next_btn = driver.find_element(By.ID, "contentMain_hlnkNextBtm")
            # If the button exists but is not a link (e.g. disabled), break
            if not next_btn.get_attribute("href"):
                break
            next_btn.click()
            time.sleep(2)  # Wait for page to load
        except NoSuchElementException:
            break  # No more pages

    return subj_courses


def main():
    # subjects = get_subjs()
    # subjects = ['PHYSICS', 'MATH', 'EECS', 'AEROSP', 'CLIMATE', 'SPACE']
    subjects = ['MCDB', 'NERS', 'TCHNCLCM', 'SCAND', 'EECS', 'CSP', 'COGSCI', 'ENGR', 'CHE', 'RCASL', 'PERSIAN', 'REEES', 'BIOPHYS', 'ANTHRBIO', 'CCS', 'AMCULT', 'COMPFOR', 'MUSMETH', 'NATIVEAM', 'SOC', 'RCSSCI', 'ROB', 'STDABRD', 'PORTUG', 'KRSTD', 'ANTHRARC', 'AMAS', 'AUTO', 'DUTCH', 'RCDRAMA', 'WRITING', 'LACS', 'ISD', 'RCSID', 'UC', 'SPACE', 'ANTHRCUL', 'WGS', 'YIDDISH', 'LING', 'RELIGION', 'GEOG', 'CSE', 'ARABIC', 'ASTRO', 'EEB', 'SPANISH', 'RCCORE', 'COMM', 'MFG', 'STS', 'CATALAN', 'PHIL', 'CMPLXSYS', 'RCSTP', 'ECE', 'ARMENIAN', 'CLIMATE', 'RCMUSIC', 'APPPHYS', 'ENGLISH', 'COMPLIT', 'MATSCIE', 'ASIANLAN', 'MECHENG', 'ELI', 'SEAS', 'MATH',
                'MIDEAST', 'HONORS', 'GTBOOKS', 'ROMLING', 'ENSCEN', 'DIGITAL', 'ITALIAN', 'POLSCI', 'PHYSICS', 'CEE', 'HEBREW', 'MENAS', 'IOE', 'RCARTS', 'EARTH', 'RCIDIV', 'INTLSTD', 'CLCIV', 'POLISH', 'CJS', 'STATS', 'MUSEUMS', 'ECON', 'FRENCH', 'ASIANPAM', 'RCLANG', 'PPE', 'GERMAN', 'BIOLOGY', 'HISTORY', 'AAS', 'LATIN', 'LATINOAM', 'FTVM', 'HISTART', 'RCHUMS', 'MACROMOL', 'AEROSP', 'ALA', 'CZECH', 'LSWA', 'TURKISH', 'INSTHUM', 'CHEM', 'ROMLANG', 'PSYCH', 'UARTS', 'BIOMEDE', 'QMSS', 'MELANG', 'JUDAIC', 'BCS', 'NEURO', 'MEMS', 'ISLAM', 'UKR', 'SLAVIC', 'ASIAN', 'ORGSTUDY', 'ARCHAM', 'RUSSIAN', 'DATASCI', 'GREEK', 'RCCWLIT', 'GREEKMOD', 'RCNSCI', 'NAVARCH']
    print(f"Found {len(subjects)} subjects: {subjects}")
    # (course_subj, course_number, course_name, course_description)
    all_courses = []
    for subj in subjects:
        subj_courses = get_courses_for_subj(subj)
        all_courses.extend(subj_courses)

    # Save courses as csv
    filename = f"data/courses.csv"
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['course_subj', 'course_number',
                        'course_name', 'course_description'])
        writer.writerows(all_courses)

    driver.quit()


main()
