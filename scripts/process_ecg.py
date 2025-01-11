import os
import h5py
import json


def find_h5_file(data_dir="../data"):  # تعديل المسار ليتناسب مع موقع مجلد data
    for file_name in os.listdir(data_dir):
        if file_name.endswith(".h5"):
            return os.path.join(data_dir, file_name)
    raise FileNotFoundError("No .h5 file found in the data directory")

# Paths
h5_file_path = find_h5_file()  
output_json_path = os.path.join("../output", "fhir_observations.json")  # تعديل مسار output ليتناسب مع مجلد output

def process_h5_to_fhir(h5_file_path, output_json_path):
    with h5py.File(h5_file_path, "r") as h5_file:
        raw_group = h5_file["98:D3:21:FC:8B:12/raw"]
        ecg_data = raw_group["channel_2"][:].flatten()
        sequence_numbers = raw_group["nSeq"][:].flatten()

    # Generate timestamps based on sequence numbers
    sampling_rate = 100  
    time_step = 1 / sampling_rate
    timestamps = sequence_numbers * time_step

    # Create FHIR-compliant Observation resources
    fhir_observations = [
        {
            "resourceType": "Observation",
            "id": str(int(seq_num)),
            "status": "final",
            "category": [
                {
                    "coding": [
                        {
                            "system": "http://hl7.org/fhir/observation-category",
                            "code": "vital-signs"
                        }
                    ]
                }
            ],
            "code": {
                "coding": [
                    {
                        "system": "http://loinc.org",
                        "code": "85354-9",
                        "display": "ECG"
                    }
                ]
            },
            "subject": {"reference": "Patient/1"},
            "effectiveDateTime": f"2024-12-23T00:00:{timestamps[i]:.2f}Z",
            "valueQuantity": {
                "value": float(ecg_data[i]),
                "unit": "mV",
                "system": "http://unitsofmeasure.org",
                "code": "mV"
            }
        }
        for i, seq_num in enumerate(sequence_numbers)
    ]

    # Save the observations as a JSON file
    os.makedirs(os.path.dirname(output_json_path), exist_ok=True)
    with open(output_json_path, "w") as json_file:
        json.dump(fhir_observations, json_file, indent=4)

    print(f"FHIR observations saved to {output_json_path}")

# Run the processing function
process_h5_to_fhir(h5_file_path, output_json_path)
