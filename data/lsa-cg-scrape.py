from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select
from selenium.common.exceptions import NoSuchElementException
import csv
import json

# --- Configuration ---
# Load credentials from config file
with open('lsa-cg-config.json', 'r') as f:
    config = json.load(f)
    UNIQNAME = config['uniqname']
    PASSWORD = config['password']
    WINTER_TERM = config["winter_term"]
    FALL_TERM = config["fall_term"]

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
            subj_code, _ = row.find_elements(By.TAG_NAME, "td")
            subjs.add(subj_code.text.strip())

    return list(subjs)


def get_courses_for_subj(subj_code):
    subj_courses = []
    seen_courses = set()
    page_num = 1
    while True:
        base_url = f"https://webapps.lsa.umich.edu/cg/cg_results.aspx?termArray={WINTER_TERM}&cgtype=ug&cgtype=gr&show=50&department={subj_code}&iPageNum={page_num}"
        driver.get(base_url)
        login()

        # Wait for the list of courses to load (reduced timeout)
        try:
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located(
                    (By.CLASS_NAME, "ClassHyperlink"))
            )
        except:
            print(f"No courses found for {subj_code}")
            break

        # Extract all course URLs at once (avoids stale element issues)
        course_paths = driver.find_elements(By.CLASS_NAME, "ClassHyperlink")
        course_paths = [elem.get_attribute('data-url')
                        for elem in course_paths]

        print(
            f"Found {len(course_paths)} courses on this page for {subj_code}.")

        # Visit each course page directly
        for course_path in course_paths:
            try:
                course_url = f"https://webapps.lsa.umich.edu/cg/{course_path}"
                driver.get(course_url)

                # Extract all data with a single JavaScript call (much faster)
                course_data = driver.execute_script("""
                    const get = id => document.getElementById(id)?.textContent?.trim() || '';
                    return {
                        subj: get('contentMain_lblSubject'),
                        number: get('contentMain_lblCatNo'),
                        title: get('contentMain_lblLongTitle'),
                        subtitle: get('contentMain_lblSubtitle'),
                        description: get('contentMain_lblDescr')
                    };
                """)

                if not course_data['subj']:
                    continue

                course_subj = course_data['subj']
                course_number = course_data['number']
                course_title = course_data['title']
                course_subtitle = course_data['subtitle']
                description = course_data['description']

                if "Course Requirements:" in description:
                    description = description.split(
                        "Course Requirements:")[0].strip()

                course_name = course_title
                if course_subtitle:
                    course_subtitle = course_subtitle.lstrip("-").strip()
                    course_name += f": {course_subtitle}"

                # Use set for faster duplicate checking
                course_key = (course_subj, course_number, course_name)
                if course_key not in seen_courses:
                    seen_courses.add(course_key)
                    subj_courses.append(
                        (course_subj, course_number, course_name, description))
                    print(
                        f"Scraped: {course_subj} {course_number} - {course_name}")

            except Exception as e:
                print(f"Error scraping {course_path}: {e}")
                continue

        driver.get(base_url)
        try:
            driver.find_element(By.ID, "contentMain_hlnkNextBtm")
            page_num += 1
        except NoSuchElementException:
            print("No more pages.")
            break

    return subj_courses


def main():
    subjects = get_subjs()
    subjects =['BIOLOGY', 'MFG', 'MCDB', 'JUDAIC', 'MUSEUMS', 'GEOG', 'ASTRO', 'MECHENG', 'RUSSIAN', 'INSTHUM', 'EDUC', 'NERS', 'IHS', 'GERMAN', 'CMPLXSYS', 'PPE', 'SM', 'UARTS', 'UKR', 'DATASCI', 'EEB', 'VOICELIT', 'NEURO', 'STDABRD', 'NAVSCI', 'COMM', 'MENAS', 'RCHUMS', 'TURKISH', 'ASIAN', 'CLIMATE', 'AEROSP', 'COMPFOR', 'RCASL', 'POLSCI', 'SPANISH', 'PHYSIOL', 'BE', 'AAS', 'NEUROSCI', 'ANTHRBIO', 'ROMLING', 'QMSS', 'HISTART', 'ISD', 'AMAS', 'BCS', 'SW', 'LACS', 'INTLSTD', 'RCCORE', 'THEORY', 'DANCE', 'RCNSCI', 'PHARMACY', 'STATS', 'COGSCI', 'INTMED', 'HUMGEN', 'ROB', 'EARTH', 'PATH', 'RCSTP', 'ARCH', 'PERSIAN', 'SCAND', 'BIOPHYS', 'GREEKMOD', 'ANATOMY', 'HEBREW', 'MICRBIOL', 'ARABIC', 'CJS', 'NAVARCH', 'BIOINF', 'PUBHLTH', 'RCMUSIC', 'MATSCIE', 'FTVM', 'MUSED', 'COMP', 'AERO', 'GREEK', 'CDB', 'MELANG', 'PORTUG', 'RCIDIV', 'STS', 'UT', 'EECS', 'ROMLANG', 'POLISH', 'APPPHYS', 'MATH', 'ENSCEN', 'SPACE', 'MIDEAST', 'ITALIAN', 'CEE', 'MOVESCI', 'MILSCI', 'PUBPOL', 'GTBOOKS', 'ARTDES', 'EPID', 'DIGITAL', 'ENGLISH', 'CCS', 'COMPLIT', 'MACROMOL', 'CSP', 'SI', 'RELIGION', 'NATIVEAM', 'EAS', 'AES', 'UC', 'LING', 'MEDCHEM', 'PHARMSCI', 'SEAS', 'ENGR', 'HONORS', 'ANTHRARC', 'BIOLCHEM', 'URP', 'MUSTHTRE', 'BIOMEDE', 'RCLANG', 'AMCULT', 'MKT', 'MEMS', 'PSYCH', 'WRITING', 'RCSSCI', 'ES', 'TO', 'LATIN', 'HISTORY', 'ECE', 'KRSTD', 'REEES', 'IOE', 'MUSPERF', 'EHS', 'RCCWLIT', 'PAT', 'FRENCH', 'BIOSTAT', 'ENS', 'DUTCH', 'ANTHRCUL', 'ISLAM', 'SOC', 'RCSID', 'MUSMETH', 'ARCHAM', 'PHRMACOL', 'YIDDISH', 'CHE', 'NURS', 'ELI', 'THTREMUS', 'CATALAN', 'PHYSICS', 'CHEM', 'LATINOAM', 'RCDRAMA', 'CLCIV', 'ECON', 'ORGSTUDY', 'WGS', 'CSE', 'MUSIC', 'AUTO', 'SLAVIC', 'RCARTS', 'JAZZ', 'ASIANLAN', 'ARMENIAN', 'ASIANPAM', 'ALA', 'LSWA', 'ARTSADMN', 'PHIL', 'MUSICOL', 'TCHNCLCM', 'ENVIRON', 'CZECH']
    print(f"Found {len(subjects)} subjects: {subjects}")
    # (course_subj, course_number, course_name, course_description)
    all_courses = []
    for subj in subjects:
        subj_courses = get_courses_for_subj(subj)
        all_courses.extend(subj_courses)

    # Save courses as csv
    filename = "courses.csv"
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['course_subj', 'course_number',
                        'course_name', 'course_description'])
        writer.writerows(all_courses)

    driver.quit()


main()
