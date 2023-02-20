import browser from 'webextension-polyfill';
import { type AwsId, type Course } from '../contentScript/primary/main';
import "./style.css";

const INPUT_CLASS = "course-toggle";

function courseSwitchesHtml(courses: Record<string, Course>, toggled: AwsId[] = []) {
    const sorted = Object.keys(courses).map((courseId) => courses[courseId]).sort((a, b) => {
        if (a.level < b.level) { return -1 }
        if (a.level > b.level) { return 1 }
        return 0
    })


    return sorted.map(course => {
        return `<label class="switch">
                    <input class="${INPUT_CLASS}" ${toggled.includes(course.awsId) ? "checked" : ""} type="checkbox" role="switch" id="${course.awsId}"/>
                    <span class="slider" style="--badge-url: url(chrome-extension://${chrome.runtime.id}/images/${course.badge})"></span>
                    <span class="name" for="${course.awsId}">${course.title}</span>
                </label>`
    }).join("");
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

browser.storage.local.get(["courses"]).then(async ({ courses}) => {
    const { toggled } = await browser.storage.sync.get("toggled");
    const html = courseSwitchesHtml(courses.data, toggled);
    document.querySelector("#app")!.innerHTML = html;

    const inputs = Array.from(document.getElementsByClassName(INPUT_CLASS) as HTMLCollectionOf<HTMLInputElement>);
    inputs.forEach(function(element) {
        element.addEventListener('input', handleSwitchToggle);
    });
})



