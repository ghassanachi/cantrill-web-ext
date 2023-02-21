import browser from 'webextension-polyfill';

export const coursesInfo = {
    "dva-c02": { "badge": "dva.png", "courseId": "1101194" },
    "saa-c03": { "badge": "saa.png", "courseId": "1820301" },
    "sap-c02": { "badge": "sap.png", "courseId": "895720" },
    "soa-c02": { "badge": "soa.png", "courseId": "1032362" },
    "dop-c02": { "badge": "dop.png", "courseId": "1101198" },
    "ans-c01": { "badge": "ans.png", "courseId": "6" },
    "scs-c01": { "badge": "scs.png", "courseId": "7" }
} as const;

// Types added here instead of background since import are restricted to contentScripts
export type Level = "associate" | "professional" | "specialty";

export type Course = {
    awsId: AwsId,
    courseId: string,
    level: Level,
    badge: string,
    title: string,
    lectures: Record<string, Lecture>
}

export type Lecture = {
    sharedWith: AwsId[]
}


export type RefreshType = {
    courseId: string,
    page: "enrolled" | "course"
}

export type AwsId = keyof typeof coursesInfo;


/*************************/
/*         Utils         */
/*************************/

function timestamp(): number {
    return new Date().getTime()
};

/*************************/
/* Handle Course Loading */
/*************************/

const COURSES_URL = "https://cantrill-json.ghassanachi.com/courses.json";
const DAY_MS = 1000 * 60 * 60 * 24;

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


export async function fetchCourses(forced: boolean = false) {
    const { courses: cached } = await browser.storage.local.get("courses");
    const timestampOrNow = cached?.timestamp;
    const moreThan1Day = timestamp() - timestampOrNow > DAY_MS;

    if (!cached?.courses || moreThan1Day || forced) {
        try {
            const raw = await fetch(COURSES_URL);
            const json = await raw.json();
            const courses = processCourses(json);

            chrome.storage.local.remove("fetchError");
            chrome.storage.local.set({ courses: { data: courses, timestamp: timestamp() } });
            return courses;
        } catch (e) {
            chrome.storage.local.set({ fetchError: "failed to retrieve courses information" });
        }
    }
    return cached?.data
}
