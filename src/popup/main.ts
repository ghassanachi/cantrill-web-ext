import browser from 'webextension-polyfill';
import { type AwsId, type Course, fetchCourses } from '~/fetchCourses';

const INPUT_CLASS = "course-toggle";


function courseSwitchesHtml(courses: Record<string, Course>, toggled: AwsId[] = []) {
    const sorted = Object.keys(courses).map((courseId) => courses[courseId]).sort((a, b) => {
        if (a.level < b.level) { return -1 }
        if (a.level > b.level) { return 1 }
        return 0
    })

    return sorted.map(course => {
        const label = document.createElement("label") as HTMLLabelElement;
        label.classList.add("switch");

        const input = document.createElement("input") as HTMLInputElement;
        input.classList.add(INPUT_CLASS);
        input.checked = toggled.includes(course.awsId)
        input.type = "checkbox";
        input.role = "switch";
        input.id = course.awsId;
        input.addEventListener('input', handleSwitchToggle);



        const slider = document.createElement("span");
        const url = browser.runtime.getURL(`/images/${course.badge}`);
        slider.classList.add("slider");
        slider.style.setProperty("--badge-url", `url(${url})`);

        const name = document.createElement("span") as HTMLSpanElement;
        name.classList.add("name");
        name.textContent = course.title;

        label.appendChild(input);
        label.appendChild(slider);
        label.appendChild(name);
        return label
    });
}

async function handleSwitchToggle(event: Event) {
    const target = event.target as HTMLInputElement;
    let store = await browser.storage.sync.get("toggled");
    let toggled: AwsId[] = store.toggled ?? [];

    if (target.checked && !toggled.includes(target.id as AwsId)) {
        toggled = [...toggled, target.id as AwsId];
    }
    if (!target.checked && toggled.includes(target.id as AwsId)) {
        toggled = toggled.filter(id => id !== target.id);
    }
    browser.storage.sync.set({ toggled: toggled });
}

const app = document.querySelector("#app")!;
async function renderSwitches(courses: Record<string, Course>) {
     const { toggled } = await browser.storage.sync.get("toggled");
    courseSwitchesHtml(courses, toggled).forEach(switches => {
        app.appendChild(switches);
    })

}

browser.storage.local.get(["courses"]).then(async ({ courses }) => {
    if (courses?.data === undefined) { 
        fetchCourses()
        return;
    };
    renderSwitches(courses.data);
})

browser.storage.local.onChanged.addListener(({ courses }) => {
    if (courses?.newValue?.data === undefined) return; 
    app.textContent = "";
    renderSwitches(courses.newValue.data);
})

