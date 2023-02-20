import browser from "webextension-polyfill";
import { type AwsId, type Course, type Lecture, type Level } from "../contentScript/primary/main";
import coursesInfo from '../../assets/courseInfo.json';

/*************************/
/*         Utils         */
/*************************/

function timestamp(): number {
    return new Date().getTime()
};

/*************************/
/* Handle Course Loading */
/*************************/

const COURSES_URL = "http://cantrill.io-dev.i-aws.cloud/courses.json";
const ALARM = "course-refresh";
const DAY_MS = 1000 * 60 * 60 * 24;
const MIN_PER_DAY = 60 * 24;

function processLectures(lectures: Record<string, any>): Record<string, Lecture> {
    return Object.keys(lectures).reduce((acc, id) => {
        const sharedWith = Object.keys(lectures[id].sharedWith);
        return {
            ...acc,
            [`${lectures[id].titleWithDuration}`]: {
                sharedWith,
            }
        }
    }, {});
}

function processCourse(course: Record<string, any>, level: Level): Course {
    return {
        awsId: course.code,
        title: (course.title as string).replace("AWS Certified ", "").split(/\s+/).join(" ").trim(),
        level: level as Level,
        badge: coursesInfo[course.code as AwsId].badge,
        courseId: coursesInfo[course.code as AwsId].courseId,
        lectures: processLectures(course.lectures),
    }

}


function processCourses(coursesJson: Record<Level, any>): Record<string, Course> {
    let courses: Record<string, Course> = {};
    for (let level of Object.keys(coursesJson) as Level[]) {
        for (let course of coursesJson[level]) {
            const { courseId } = coursesInfo[course.code as AwsId];
            courses[courseId] = processCourse(course, level as Level);
        }
    }
    return courses;
}


async function refreshCourses(forced: boolean = false) {
    const cached = await browser.storage.local.get("courses");
    const timestampOrNow = cached?.timestamp ?? timestamp();
    const olderThan1Day = timestamp() - timestampOrNow > DAY_MS;

    if (!forced && olderThan1Day) {
        return;
    }

    try {
        const raw = await fetch(COURSES_URL);
        const json = await raw.json();
        const courses = processCourses(json);

        chrome.storage.local.remove("fetchError");
        chrome.storage.local.set({ courses: { data: courses, timestamp: timestamp() } });
        // Refresh courses every day
        browser.alarms.create(ALARM, { periodInMinutes: MIN_PER_DAY });
    } catch (e) {
        chrome.storage.local.set({ fetchError: "failed to retrieve courses information" });
        // If we have a failure than retry every minute;
        browser.alarms.create(ALARM, { periodInMinutes: 1 });
    }
}


// Retrieve course information when extension is installed
browser.runtime.onInstalled.addListener(async () => {
    await refreshCourses()
});

// Maybe to retrieve course information when extension is started
browser.runtime.onStartup.addListener(async () => {
    await refreshCourses();
});

// Update course information every day;
browser.alarms.onAlarm.addListener(async () => {
    await refreshCourses();
})

