import * as React from 'react';
import clsx from 'clsx';
import TextField, { TextFieldProps } from '@mui/material/TextField';
import { useInput, FieldTitle } from 'ra-core';
import {
    ComponentsOverrides,
    styled,
    useThemeProps,
    Theme,
} from '@mui/material/styles';

import { CommonInputProps } from './CommonInputProps';
import { sanitizeInputRestProps } from './sanitizeInputRestProps';
import { InputHelperText } from './InputHelperText';
import { useForkRef, major as muiMajor } from '@mui/material';

export const DateTimeInput = (props: DateTimeInputProps) => {
    const {
        className,
        defaultValue,
        format = formatDateTime,
        label,
        helperText,
        margin,
        onBlur,
        onChange,
        onFocus,
        source,
        resource,
        validate,
        variant,
        disabled,
        readOnly,
        ...rest
    } = useThemeProps({
        props: props,
        name: PREFIX,
    });

    const { field, fieldState, id, isRequired } = useInput({
        defaultValue,
        onBlur,
        resource,
        source,
        validate,
        disabled,
        readOnly,
        format,
        ...rest,
    });
    const localInputRef = React.useRef<HTMLInputElement>();
    const initialDefaultValueRef = React.useRef(field.value);
    const [inputKey, setInputKey] = React.useState(1);
    const wasLastChangedByInput = React.useRef(false);

    React.useEffect(() => {
        if (wasLastChangedByInput.current) {
            wasLastChangedByInput.current = false;
            return;
        }

        const hasNewValueFromForm =
            localInputRef.current?.value !== field.value &&
            !(localInputRef.current?.value === '' && field.value == null);

        if (hasNewValueFromForm) {
            initialDefaultValueRef.current = field.value;
            setInputKey(r => r + 1);
            wasLastChangedByInput.current = false;
        }
    }, [setInputKey, field.value]);

    const { onBlur: onBlurFromField } = field;
    const hasFocus = React.useRef(false);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (onChange) {
            onChange(event);
        }
        if (
            typeof event.target === 'undefined' ||
            typeof event.target.value === 'undefined'
        ) {
            return;
        }
        const target = event.target;
        const newValue = target.value;
        const isNewValueValid =
            newValue === '' || !isNaN(new Date(target.value).getTime());

        if (newValue !== '' && newValue != null && isNewValueValid) {
            field.onChange(newValue);
            wasLastChangedByInput.current = true;
        }
    };

    const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
        if (onFocus) {
            onFocus(event);
        }
        hasFocus.current = true;
    };

    const handleBlur = () => {
        hasFocus.current = false;

        if (!localInputRef.current) {
            return;
        }

        const newValue = localInputRef.current.value;
        const isNewValueValid =
            newValue === '' ||
            !isNaN(new Date(localInputRef.current.value).getTime());

        if (isNewValueValid && field.value !== newValue) {
            field.onChange(newValue ?? '');
        }

        if (onBlurFromField) {
            onBlurFromField();
        }
    };

    const { error, invalid } = fieldState;
    const renderHelperText = helperText !== false || invalid;
    const { ref, name } = field;
    const inputRef = useForkRef(ref, localInputRef);

    const mergedSlotProps = {
        // @ts-expect-error slotProps do not yet exist in MUI v5
        ...rest.slotProps,
        inputLabel: {
            ...defaultInputLabelProps,
            // @ts-expect-error slotProps do not yet exist in MUI v5
            ...rest.slotProps?.inputLabel,
        },
    };

    return (
        <StyledTextField
            id={id}
            inputRef={inputRef}
            name={name}
            defaultValue={format(initialDefaultValueRef.current)}
            key={inputKey}
            type="datetime-local"
            required={isRequired}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={clsx('ra-input', `ra-input-${source}`, className)}
            size="small"
            variant={variant}
            margin={margin}
            error={invalid}
            disabled={disabled || readOnly}
            readOnly={readOnly}
            helperText={
                renderHelperText ? (
                    <InputHelperText
                        error={error?.message}
                        helperText={helperText}
                    />
                ) : null
            }
            label={
                label !== '' && label !== false ? (
                    <FieldTitle
                        label={label}
                        source={source}
                        resource={resource}
                        isRequired={isRequired}
                    />
                ) : null
            }
            InputLabelProps={defaultInputLabelProps}
            {...sanitizeInputRestProps(rest)}
            {...(muiMajor >= 6 ? { slotProps: mergedSlotProps } : {})}
        />
    );
};

export type DateTimeInputProps = CommonInputProps &
    Omit<TextFieldProps, 'helperText' | 'label'>;

const leftPad =
    (nb = 2) =>
    (value: number) =>
        ('0'.repeat(nb) + value.toString()).slice(-nb);
const leftPad4 = leftPad(4);
const leftPad2 = leftPad(2);

const convertDateToString = (value: Date) => {
    if (!(value instanceof Date) || isNaN(value.getDate())) return '';
    const yyyy = leftPad4(value.getFullYear());
    const MM = leftPad2(value.getMonth() + 1);
    const dd = leftPad2(value.getDate());
    const hh = leftPad2(value.getHours());
    const mm = leftPad2(value.getMinutes());
    return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
};

const dateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const defaultInputLabelProps = { shrink: true };

const formatDateTime = (value: string | Date) => {
    if (value == null || value === '') {
        return '';
    }

    if (value instanceof Date) {
        return convertDateToString(value);
    }
    if (dateTimeRegex.test(value)) {
        return value;
    }

    return convertDateToString(new Date(value));
};

const PREFIX = 'RaDateTimeInput';

const StyledTextField = styled(TextField, {
    name: PREFIX,
    overridesResolver: (props, styles) => styles.root,
})({});

declare module '@mui/material/styles' {
    interface ComponentNameToClassKey {
        [PREFIX]: 'root';
    }

    interface ComponentsPropsList {
        [PREFIX]: Partial<DateTimeInputProps>;
    }

    interface Components {
        [PREFIX]?: {
            defaultProps?: ComponentsPropsList[typeof PREFIX];
            styleOverrides?: ComponentsOverrides<
                Omit<Theme, 'components'>
            >[typeof PREFIX];
        };
    }
}
