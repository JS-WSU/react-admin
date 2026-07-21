import * as React from 'react';
import clsx from 'clsx';
import TextField, { TextFieldProps } from '@mui/material/TextField';
import { useInput, FieldTitle, useEvent } from 'ra-core';
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

export const DateInput = (props: DateInputProps) => {
    const {
        className,
        defaultValue,
        format = defaultFormat,
        label,
        source,
        resource,
        helperText,
        margin,
        onChange,
        onFocus,
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

    const handleChange = useEvent(
        (event: React.ChangeEvent<HTMLInputElement>) => {
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
                newValue === '' ||
                (target.valueAsDate != null &&
                    !isNaN(new Date(target.valueAsDate).getTime()));

            if (newValue !== '' && newValue != null && isNewValueValid) {
                field.onChange(newValue);
                wasLastChangedByInput.current = true;
            }
        }
    );

    const handleFocus = useEvent(
        (event: React.FocusEvent<HTMLInputElement>) => {
            if (onFocus) {
                onFocus(event);
            }
            hasFocus.current = true;
        }
    );

    const handleBlur = useEvent(() => {
        hasFocus.current = false;

        if (!localInputRef.current) {
            return;
        }

        const newValue = localInputRef.current.value;
        const isNewValueValid =
            newValue === '' ||
            (localInputRef.current.valueAsDate != null &&
                !isNaN(new Date(localInputRef.current.valueAsDate).getTime()));

        if (isNewValueValid && field.value !== newValue) {
            field.onChange(newValue ?? '');
        }

        if (onBlurFromField) {
            onBlurFromField();
        }
    });
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
            name={name}
            inputRef={inputRef}
            defaultValue={format(initialDefaultValueRef.current)}
            key={inputKey}
            type="date"
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
            inputProps={{
                required: isRequired,
                ...rest.inputProps,
            }}
        />
    );
};

export type DateInputProps = CommonInputProps &
    Omit<TextFieldProps, 'helperText' | 'label'>;

const convertDateToString = (value: Date) => {
    if (!(value instanceof Date) || isNaN(value.getDate())) return '';
    const localDate = new Date(value.getTime());
    const pad = '00';
    const yyyy = localDate.getFullYear().toString();
    const MM = (localDate.getMonth() + 1).toString();
    const dd = localDate.getDate().toString();
    return `${yyyy}-${(pad + MM).slice(-2)}-${(pad + dd).slice(-2)}`;
};

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const defaultInputLabelProps = { shrink: true };

const defaultFormat = (value: string | Date | number) => {
    if (value == null || value === '') {
        return null;
    }
    if (value instanceof Date) {
        return convertDateToString(value);
    }
    if (typeof value === 'string') {
        if (dateRegex.test(value)) {
            return value;
        }
    }
    return convertDateToString(new Date(value));
};

const PREFIX = 'RaDateInput';

const StyledTextField = styled(TextField, {
    name: PREFIX,
    overridesResolver: (props, styles) => styles.root,
})({});

declare module '@mui/material/styles' {
    interface ComponentNameToClassKey {
        [PREFIX]: 'root';
    }

    interface ComponentsPropsList {
        [PREFIX]: Partial<DateInputProps>;
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
