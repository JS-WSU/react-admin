import * as React from 'react';
import {
    ChangeEvent,
    createContext,
    isValidElement,
    ReactElement,
    useContext,
    useRef,
    useState,
} from 'react';
import { Identifier } from '../../types';
import { OptionText } from '../../form/choices/useChoices';
import { useTranslate } from '../../i18n/useTranslate';
import set from 'lodash/set.js';

export const useSupportCreateSuggestion = (
    options: SupportCreateSuggestionOptions
): UseSupportCreateValue => {
    const {
        create,
        createLabel = 'ra.action.create',
        createItemLabel,
        createValue = '@@ra-create',
        createHintValue = '@@ra-create-hint',
        optionText = 'name',
        filter,
        handleChange,
        onCreate,
    } = options;

    const translate = useTranslate();
    const [renderOnCreate, setRenderOnCreate] = useState(false);
    const filterRef = useRef(filter);

    return {
        createId: createValue,
        createHintId: createHintValue,
        getCreateItem: (filter?: string) => {
            filterRef.current = filter;

            return set(
                {
                    id:
                        createItemLabel && !filter
                            ? createHintValue
                            : createValue,
                },
                typeof optionText === 'string' ? optionText : 'name',
                filter && createItemLabel
                    ? typeof createItemLabel === 'string'
                        ? translate(createItemLabel, {
                              item: filter,
                              _: createItemLabel,
                          })
                        : createItemLabel(filter)
                    : typeof createLabel === 'string'
                      ? translate(createLabel, { _: createLabel })
                      : createLabel
            ) as { id: Identifier; [key: string]: unknown };
        },
        handleChange: async (
            eventOrValue: ChangeEvent<HTMLInputElement> | unknown
        ) => {
            const value =
                (eventOrValue as { target?: { value?: unknown } })?.target
                    ?.value || eventOrValue;
            const finalValue = Array.isArray(value) ? [...value].pop() : value;
            const castFinalValue = finalValue as { id?: unknown } | unknown;

            if (
                (castFinalValue &&
                    typeof castFinalValue === 'object' &&
                    'id' in castFinalValue &&
                    castFinalValue.id === createValue) ||
                finalValue === createValue
            ) {
                if (!isValidElement(create)) {
                    if (!onCreate) {
                        throw new Error(
                            'To create a new option, you must pass an onCreate function or a create element.'
                        );
                    }
                    const newSuggestion = await onCreate(filter);
                    if (newSuggestion) {
                        handleChange(newSuggestion);
                        return;
                    }
                } else {
                    setRenderOnCreate(true);
                    return;
                }
            }
            handleChange(eventOrValue);
        },
        createElement:
            renderOnCreate && isValidElement(create) ? (
                <CreateSuggestionContext.Provider
                    value={{
                        filter: filterRef.current,
                        onCancel: () => setRenderOnCreate(false),
                        onCreate: item => {
                            setRenderOnCreate(false);
                            handleChange(item);
                        },
                    }}
                >
                    {create}
                </CreateSuggestionContext.Provider>
            ) : null,
        getOptionDisabled: (option: unknown) => {
            const optionCast = option as { id?: unknown } | unknown;
            return (
                (optionCast &&
                    typeof optionCast === 'object' &&
                    'id' in optionCast &&
                    optionCast.id === createHintValue) ||
                option === createHintValue
            );
        },
    };
};

export interface SupportCreateSuggestionOptions {
    create?: ReactElement;
    createValue?: string;
    createHintValue?: string;
    createLabel?: React.ReactNode;
    createItemLabel?: string | ((filter: string) => React.ReactNode);
    filter?: string;
    handleChange: (value: unknown) => void;
    onCreate?: OnCreateHandler;
    optionText?: OptionText;
}

export interface UseSupportCreateValue {
    createId: string;
    createHintId: string;
    getCreateItem: (filterValue?: string) => {
        id: Identifier;
        [key: string]: unknown;
    };
    handleChange: (
        eventOrValue: ChangeEvent<HTMLInputElement> | unknown
    ) => Promise<void>;
    createElement: ReactElement | null;
    getOptionDisabled: (option: unknown) => boolean;
}

const CreateSuggestionContext = createContext<
    CreateSuggestionContextValue | undefined
>(undefined);

interface CreateSuggestionContextValue {
    filter?: string;
    onCreate: (choice: unknown) => void;
    onCancel: () => void;
}

export const useCreateSuggestionContext = () => {
    const context = useContext(CreateSuggestionContext);
    if (!context) {
        throw new Error(
            'useCreateSuggestionContext must be used inside a CreateSuggestionContext.Provider'
        );
    }
    return context;
};

export type OnCreateHandler = (filter?: string) => unknown | Promise<unknown>;
