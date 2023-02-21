import browser from 'webextension-polyfill';
import { type AwsId, type Course, coursesInfo, fetchCourses, type RefreshType } from '~/fetchCourses.js';

const ENROLLED_REGEX = /^\/courses\/enrolled\/(\d+)/;
const COURSE_REGEX = /^\/courses\/(\d+)/;
const EXT_DOM_INIT_ID = "ac-ext-loaded-" + Math.round(Math.random() * 10000000);
const LECTURE_CLASSNAME = "lecture-name";
const BADGE_CLASSNAME = "ac-ext-badge";


/*******************/
/*   DOM Handlers  */
/*******************/

export function getPageType(pathname: string): RefreshType | null {
    if (ENROLLED_REGEX.test(pathname)) {
        const match = pathname.match(ENROLLED_REGEX) as RegExpMatchArray;
        return { courseId: match[1], page: "enrolled" };
    } else if (COURSE_REGEX.test(pathname)) {
        const match = pathname.match(COURSE_REGEX) as RegExpMatchArray;
        return { courseId: match[1], page: "course" };
    }
    return null;
}


let state: {
    courses: Record<string, Course>,
    toggled: AwsId[],
    sortOrder: Record<string, number>
} | null = null;

const cleanLectureName = (name: string): string => {
    const cleaned = name.split(/\s+/).join(" ").trim();
    if (cleaned.endsWith(" )")) {
        return cleaned.slice(0, cleaned.length - 2) + ")";
    }
    return cleaned

}

function updateDOM(page: RefreshType, curState: NonNullable<typeof state>) {
    const initElement = document.createElement("div");
    initElement.id = EXT_DOM_INIT_ID;
    initElement.style.display = "none";
    document.body.appendChild(initElement);

    let currentCourses = curState.courses[page.courseId];
    let lectureNodes = Array.from(document.getElementsByClassName(LECTURE_CLASSNAME));
    for (let lectureNode of lectureNodes) {
        const lectureName = cleanLectureName(lectureNode.textContent ?? "")
        const lecture = currentCourses.lectures[lectureName]
        if (!lecture) {
            console.log(`Lecture "${lectureName}" not found in courses list`);
            continue;
        }
        if (lecture.sharedWith.length === 0) continue;

        const badgeContainer = document.createElement("div");
        badgeContainer.classList.add("ac-ext-badge-container");

        for (let sharedWith of lecture.sharedWith) {
            const badge = document.createElement("img");
            badge.classList.add(BADGE_CLASSNAME);
            badge.classList.add(`${BADGE_CLASSNAME}-${sharedWith}`);
            badge.style.order = `${curState.sortOrder[sharedWith]}`;
            badge.style.display = "none";
            badge.src = browser.runtime.getURL(`/images/${coursesInfo[sharedWith].badge}`);
            badge.alt = sharedWith;
            badge.title = sharedWith;
            badgeContainer.appendChild(badge);
        }
        lectureNode.parentElement!.style.position = "relative";
        lectureNode!.after(badgeContainer);
    }
}

function showHideBadges(toggled: AwsId[], all: AwsId[]) {
    console.log(`Cantrill Ext | Updating badge visibility toggled=${toggled.join(",")}`);
    for (let course of all) {
        if (toggled.includes(course)) {
            for (let node of Array.from(document.getElementsByClassName(`${BADGE_CLASSNAME}-${course}`)) as HTMLImageElement[]) {
                node.style.display = "block";
            }
        } else {
            for (let node of Array.from(document.getElementsByClassName(`${BADGE_CLASSNAME}-${course}`)) as HTMLImageElement[]) {
                node.style.display = "none";
            }
        }
    }
}

async function tryUpdateDOM(force = false) {
    const page = getPageType(location.pathname);
    if (page === null) return;
    console.log(`Cantrill Ext | Try updating DOM for course "${page.courseId}" on page "${page.page}"`);


    if (state === null) {
        console.log(`Cantrill Ext | Loading initial state`);
        const courses: Record<string, Course> = (await browser.storage.local.get("courses"))?.courses?.data ?? null;
        const toggled: AwsId[] = (await browser.storage.sync.get("toggled"))?.toggled ?? [];
        if (courses === null) { return };
        const sortOrder = Object.keys(courses).map((courseId) => ({ awsId: courses[courseId].awsId, level: courses[courseId].level })).sort((a, b) => {
            if (a.level > b.level) { return 1 }
            if (a.level < b.level) { return -1 }
            return 0
        }).reduce((acc, el, idx) => ({ ...acc, [`${el.awsId}`]: idx + 1 }), {}) as Record<AwsId, number>
        state = {
            courses,
            toggled,
            sortOrder,
        }
    }

    // Only update the DOM if it has not already been updated;
    let isInit = Array.from(document.getElementsByClassName(BADGE_CLASSNAME)).length !== 0;
    // Clean up if we are forcing a refresh because of state change
    if (force) {
        const badges = Array.from(document.getElementsByClassName(BADGE_CLASSNAME));
        badges.forEach(b => b.remove());
    }

    if (force || !isInit) {
        console.log(`Cantrill Ext | Updating DOM`);
        updateDOM(page, state as any);
    }
    showHideBadges(state.toggled, Object.keys(state.sortOrder) as AwsId[]);

}

function addCssStyles(
    cssPaths: string[],
) {
    cssPaths.forEach((cssPath: string) => {
        const styleEl = document.createElement("link");
        styleEl.setAttribute("rel", "stylesheet");
        styleEl.setAttribute("href", browser.runtime.getURL(cssPath));
        document.head.appendChild(styleEl);
    });
}




/*******************/
/*    Entry Point  */
/*******************/
function main() {
    addCssStyles(["/css/content.css"]);

    // Listen for DOM changes and then check if you should make changes
    new MutationObserver(() => { 
        console.log("Cantrill Ext | DOM Updated checking if re-render necessary");
        tryUpdateDOM()
    }).observe(document.body, { childList: true })

    browser.storage.onChanged.addListener((changes) => {
        console.log("Cantrill Ext | State change received")
        if (state == null) return;
        if (changes.toggled?.newValue) {
            state.toggled = changes.toggled.newValue;
        }
        if (changes.courses?.newValue) {
            state.courses = changes.toggled.newValue;
        }
        tryUpdateDOM(!!changes.courses?.newValue);
    });

    fetchCourses().then(() => {
        console.log("Cantrill Ext | Fetching courses")
        tryUpdateDOM();
    }).catch(() => console.error(`Cantrill Ext |Failed to retrieve course info`))

    console.log("Cantrill Ext | Extension Initialized");
}

// Call entry point
main()


