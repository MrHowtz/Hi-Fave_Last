const socket = new WebSocket('ws://localhost:3000');

const ctx = document.getElementById('ecg-chart').getContext('2d');

// إعداد الرسم البياني لشكل ECG الحقيقي
const ecgChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: Array(50).fill(""), // محور X ثابت مع 50 نقطة فارغة
        datasets: [{
            label: 'ECG Signal',
            data: Array(50).fill(0), // 50 نقطة تبدأ بالقيمة 0
            borderColor: 'rgba(0, 255, 0, 1)',
            borderWidth: 2,
            tension: 0.1, // سلاسة الموجة
        }]
    },
    options: {
        animation: true, // تعطيل الرسوم المتحركة لتسريع التحديث
        scales: {
            x: {
                display: true, // إخفاء المحور الأفقي لتسريع الأداء
            },
            y: {
                title: {
                    display: true,
                    text: 'Voltage (mV)'
                },
                min: -1,
                max: 2, // نطاق الجهد لتناسب شكل ECG
            }
        },
        plugins: {
            legend: {
                display: true // إخفاء التسمية لتبسيط العرض
            }
        }
    }
});

// بيانات موجة ECG نموذجية (محاكاة القمم والوديان)
const ecgTemplate = [0, 0.2, 0.5, -0.1, -0.5, 0, 0.8, 1.5, 0.8, 0.2, 0, -0.2, -0.5, 0, 0.1];

let currentData = Array(50).fill(0); // القيم الحالية المعروضة
let index = 0;
let updateInterval = 500; // تحديث الرسم البياني كل 500 مللي ثانية (نصف ثانية)
let lastUpdateTime = Date.now();

socket.onopen = () => {
    console.log('WebSocket connection established');
};

socket.onmessage = (event) => {
    const currentTime = Date.now();

    // تحديث الرسم البياني كل 500 مللي ثانية فقط
    if (currentTime - lastUpdateTime >= updateInterval) {
        // محاكاة قيمة جديدة من الموجة النموذجية
        const simulatedValue = ecgTemplate[index % ecgTemplate.length];

        // تحديث البيانات (نافذة منزلقة)
        currentData.shift(); // إزالة أول نقطة
        currentData.push(simulatedValue); // إضافة النقطة الجديدة

        // تحديث الرسم البياني
        ecgChart.data.datasets[0].data = currentData;
        ecgChart.update();

        lastUpdateTime = currentTime; // تحديث وقت آخر تحديث
    }

    index++;
};

socket.onerror = (error) => {
    console.error('WebSocket error:', error);
};

socket.onclose = () => {
    console.log('WebSocket connection closed');
};
