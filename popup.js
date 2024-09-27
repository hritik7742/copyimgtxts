const fileInput = document.getElementById('file-input');
const pdfInput = document.getElementById('pdf-input');
const dropArea = document.getElementById('drop-area');
const filePreview = document.getElementById('file-preview');
const extractedText = document.getElementById('extracted-text');
const cropBtn = document.getElementById('cropBtn');
let cropper;

function handleFile(file) {
    if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            filePreview.innerHTML = `<img src="${e.target.result}" alt="Uploaded image">`;
            extractText(e.target.result);
        };
        reader.readAsDataURL(file);
    } else if (file.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onload = function(e) {
            const typedarray = new Uint8Array(e.target.result);
            displayPDF(typedarray);
        };
        reader.readAsArrayBuffer(file);
    }
}

fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
pdfInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

dropArea.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files[0];
    handleFile(file);
});

function extractText(imageData) {
    extractedText.textContent = 'Extracting text...';
    Tesseract.recognize(imageData, 'eng', { logger: m => console.log(m) })
        .then(({ data: { text } }) => {
            extractedText.textContent = text || 'No text found in the image.';
        })
        .catch(error => {
            console.error(error);
            extractedText.textContent = 'An error occurred while processing the image.';
        });
}

function displayPDF(data) {
    pdfjsLib.getDocument(data).promise.then(function(pdf) {
        pdf.getPage(1).then(function(page) {
            var scale = 1.5;
            var viewport = page.getViewport({ scale: scale });
            var canvas = document.createElement('canvas');
            var context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            filePreview.innerHTML = '';
            filePreview.appendChild(canvas);
            page.render({
                canvasContext: context,
                viewport: viewport
            });
            extractTextFromPDF(pdf);
        });
    });
}

function extractTextFromPDF(pdf) {
    extractedText.textContent = 'Extracting text from PDF...';
    let allText = '';
    let processedPages = 0;

    function processPage(pageNum) {
        pdf.getPage(pageNum).then(function(page) {
            page.getTextContent().then(function(textContent) {
                const pageCanvas = document.createElement('canvas');
                const pageCtx = pageCanvas.getContext('2d');
                const viewport = page.getViewport({scale: 1.5});
                pageCanvas.height = viewport.height;
                pageCanvas.width = viewport.width;

                const renderContext = {
                    canvasContext: pageCtx,
                    viewport: viewport
                };

                page.render(renderContext).promise.then(() => {
                    Tesseract.recognize(pageCanvas.toDataURL(), 'eng', { logger: m => console.log(m) })
                        .then(({ data: { text } }) => {
                            allText += text + '\n\n';
                            processedPages++;

                            if (processedPages === pdf.numPages) {
                                extractedText.textContent = allText || 'No text found in the PDF.';
                            } else {
                                processPage(processedPages + 1);
                            }
                        });
                });
            });
        });
    }

    processPage(1);
}

function copyText(type) {
    let textToCopy = type === 'all' ? extractedText.textContent : window.getSelection().toString();
    if (textToCopy) {
        navigator.clipboard.writeText(textToCopy).then(() => {
            alert('Text copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
    } else {
        alert('No text to copy. Please extract text from a file first.');
    }
}

function toggleCropping() {
    const image = filePreview.querySelector('img');
    if (image) {
        if (cropper) {
            applyCrop();
        } else {
            startCropping(image);
        }
    } else {
        alert('Please upload an image to use the region selection feature.');
    }
}

function startCropping(image) {
    cropper = new Cropper(image, {
        aspectRatio: NaN,
        viewMode: 1,
    });
    cropBtn.textContent = 'Extract Selected Region';
}

function applyCrop() {
    if (cropper) {
        const croppedCanvas = cropper.getCroppedCanvas();
        if (croppedCanvas) {
            extractText(croppedCanvas.toDataURL());
        }
        cropper.destroy();
        cropper = null;
        cropBtn.textContent = 'Select Region';
    }
}

 // Add this function to handle URL parameters
 function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

// Add this function to handle image data from the extension
function handleExtensionImageData() {
    const imageData = getUrlParameter('imageData');
    if (imageData) {
        const img = new Image();
        img.onload = function() {
            filePreview.innerHTML = '';
            filePreview.appendChild(img);
            extractText(imageData);
        };
        img.src = imageData;
    }
}

// Call this function when the page loads
window.onload = function() {
    handleExtensionImageData();
};
