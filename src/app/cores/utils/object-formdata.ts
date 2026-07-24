export function objectToFormData(obj: any, formData: FormData = new FormData(), parentKey: string = ''): FormData {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      const formKey = parentKey ? `${parentKey}[${key}]` : key;

      if (value instanceof Date) {
        formData.append(formKey, value.toISOString());
      } else if (value instanceof File) {
        formData.append(formKey, value);
      } else if (value && typeof value === 'object' && !(value instanceof File)) {
        objectToFormData(value, formData, formKey);
      } else if (value !== null && value !== undefined) {
        formData.append(formKey, value);
      }
    }
  }
  return formData;
}
